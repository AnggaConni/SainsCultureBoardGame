import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../site-intelligence-worker.js", import.meta.url), "utf8");
const module = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const worker = module.default;

async function requestWorker(path, options = {}) {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const cache = new Map();
  let upstreamCalls = 0;
  const records = [];
  globalThis.caches = {
    default: {
      match: async key => {
        const hit = cache.get(typeof key === "string" ? key : key.url);
        return hit ? hit.clone() : null;
      },
      put: async (key, response) => cache.set(typeof key === "string" ? key : key.url, response.clone())
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    upstreamCalls += 1;
    const url = new URL(typeof input === "string" ? input : input.url);
    records.push({ url, init });
    if (options.fetchMock) return options.fetchMock(url, init);
    throw new Error("Unexpected upstream fetch: " + url);
  };
  try {
    const headers = {};
    if (options.origin !== null) headers.Origin = options.origin || "https://anggaconni.github.io";
    if (options.ip) headers["CF-Connecting-IP"] = options.ip;
    const request = new Request("https://worker.example" + path, { method: options.method || "GET", headers });
    const response = await worker.fetch(request, options.env || {}, { waitUntil: promise => promise });
    return { response, body: await response.json(), upstreamCalls, records, cache };
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
}

test("health endpoint is public and does not disclose provider secrets", async () => {
  const { response, body, upstreamCalls } = await requestWorker("/health");
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, "World Heritage Atlas Site Intelligence");
  assert.equal("TINYFISH_API_KEY" in body, false);
  assert.equal(upstreamCalls, 0);
});

test("rejects unapproved origins", async () => {
  const { response, body, upstreamCalls } = await requestWorker("/site-intel?scope=news&site=Borobudur", {
    origin: "https://evil.example",
    env: { ALLOWED_ORIGINS: "https://anggaconni.github.io", TINYFISH_API_KEY: "test-key" }
  });
  assert.equal(response.status, 403);
  assert.equal(body.error, "Origin not allowed");
  assert.equal(upstreamCalls, 0);
});

test("validates scope and site name before making provider calls", async () => {
  const blank = await requestWorker("/site-intel?scope=news&site=%20%20");
  assert.equal(blank.response.status, 400);
  const invalidScope = await requestWorker("/site-intel?scope=all&site=Borobudur");
  assert.equal(invalidScope.response.status, 400);
});

test("news endpoint explains when TinyFish is not configured", async () => {
  const { response, body, upstreamCalls } = await requestWorker("/site-intel?scope=news&site=Borobudur&country=Indonesia");
  assert.equal(response.status, 200);
  assert.equal(body.status, "not_configured");
  assert.equal(body.provider, "TinyFish Search");
  assert.deepEqual(body.items, []);
  assert.match(body.message, /TINYFISH_API_KEY/);
  assert.equal(upstreamCalls, 0);
});

test("news endpoint normalizes TinyFish results and preserves provenance", async () => {
  const { response, body, records } = await requestWorker("/site-intel?scope=news&site=Borobudur&country=Indonesia", {
    env: { TINYFISH_API_KEY: "test-tinyfish-key", ALLOWED_ORIGINS: "https://anggaconni.github.io" },
    fetchMock: async (url, init) => {
      assert.equal(url.hostname, "api.search.tinyfish.ai");
      assert.equal(init.headers["X-API-Key"], "test-tinyfish-key");
      assert.match(url.searchParams.get("query"), /Borobudur/);
      return new Response(JSON.stringify({ results: [
        { title: "Borobudur conservation update", url: "https://news.example/borobudur", snippet: "A report about conservation.", source: "News Example", publishedAt: "2026-10-15" },
        { title: "Duplicate result", url: "https://news.example/borobudur" },
        { title: "Unsafe link", url: "javascript:alert(1)" }
      ] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.count, 1);
  assert.equal(body.items[0].title, "Borobudur conservation update");
  assert.equal(body.items[0].publishedAt, "2026-10-15T00:00:00.000Z");
  assert.equal(body.items[0].evidenceStatus, "unverified-source-lead");
  assert.equal(records.length, 1);
});

test("research endpoint normalizes OpenAlex works and uses an optional API key server-side", async () => {
  const { response, body, records } = await requestWorker("/site-intel?scope=research&site=Komodo%20National%20Park&country=Indonesia", {
    env: { OPENALEX_API_KEY: "private-openalex-key" },
    fetchMock: async (url, init) => {
      assert.equal(url.hostname, "api.openalex.org");
      assert.equal(url.pathname, "/works");
      assert.equal(url.searchParams.get("search"), "Komodo National Park");
      assert.equal(init.headers.Authorization, "Bearer private-openalex-key");
      return new Response(JSON.stringify({
        meta: { count: 1 },
        results: [{
          id: "https://openalex.org/W123",
          doi: "https://doi.org/10.1234/example",
          title: "Conservation research at Komodo National Park",
          publication_year: 2025,
          type: "article",
          authorships: [{ author: { display_name: "A. Researcher" } }],
          primary_location: { source: { display_name: "Journal of Heritage" }, landing_page_url: "https://journal.example/paper" },
          cited_by_count: 12,
          open_access: { is_oa: true, oa_url: "https://repository.example/paper.pdf" }
        }]
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });
  assert.equal(response.status, 200);
  assert.equal(body.provider, "OpenAlex");
  assert.equal(body.status, "ok");
  assert.equal(body.count, 1);
  assert.equal(body.items[0].year, 2025);
  assert.deepEqual(body.items[0].authors, ["A. Researcher"]);
  assert.equal(body.items[0].citedByCount, 12);
  assert.equal(body.items[0].isOpenAccess, true);
  assert.equal(body.items[0].openAccessUrl, "https://repository.example/paper.pdf");
  assert.equal(records.length, 1);
});

test("same scope/site/country is served from cache within TTL", async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const cache = new Map();
  let callCount = 0;
  globalThis.caches = {
    default: {
      match: async key => cache.get(key.url)?.clone() || null,
      put: async (key, response) => cache.set(key.url, response.clone())
    }
  };
  globalThis.fetch = async () => {
    callCount += 1;
    return new Response(JSON.stringify({ results: [{ title: "Site story", url: "https://news.example/story" }] }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  };
  try {
    const env = { TINYFISH_API_KEY: "test-key" };
    const makeRequest = () => new Request("https://worker.example/site-intel?scope=news&site=Site&country=Indonesia", {
      headers: { Origin: "https://anggaconni.github.io" }
    });
    const first = await worker.fetch(makeRequest(), env, {});
    const bodyOne = await first.json();
    const second = await worker.fetch(makeRequest(), env, {});
    const bodyTwo = await second.json();
    assert.equal(callCount, 1);
    assert.equal(bodyOne.count, 1);
    assert.equal(bodyTwo.cached, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
});

test("unrecognized paths and methods are rejected", async () => {
  const missing = await requestWorker("/not-an-endpoint");
  assert.equal(missing.response.status, 404);
  const wrongMethod = await requestWorker("/health", { method: "POST" });
  assert.equal(wrongMethod.response.status, 405);
});


test("news endpoint supports TinyFish organic_results payloads", async () => {
  const { body } = await requestWorker("/site-intel?scope=news&site=Prambanan&country=Indonesia", {
    env: { TINYFISH_API_KEY: "test-key" },
    fetchMock: async () => new Response(JSON.stringify({
      organic_results: [
        { title: "Prambanan heritage management", link: "https://publisher.example/prambanan", description: "A source lead about the site." }
      ]
    }), { status: 200, headers: { "Content-Type": "application/json" } })
  });
  assert.equal(body.status, "ok");
  assert.equal(body.count, 1);
  assert.equal(body.items[0].url, "https://publisher.example/prambanan");
});
