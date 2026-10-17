/**
 * World Heritage Atlas — Site Intelligence Worker.
 *
 * GET /site-intel?scope=news|research&site=...&country=...
 * GET /health
 *
 * News results are source leads, not independently verified facts.
 * OpenAlex results are relevance-ranked scholarly metadata, not proof that every
 * paper refers exclusively to the selected place.
 */
const VERSION = "1.0.0";
const DEFAULT_ALLOWED_ORIGINS = "https://anggaconni.github.io";
const NEWS_TTL_SECONDS = 3 * 60 * 60;
const RESEARCH_TTL_SECONDS = 24 * 60 * 60;
const REQUEST_WINDOW_MS = 60 * 1000;
const REQUEST_LIMIT_PER_IP = 12;
const SITE_NAME_MAX = 140;
const COUNTRY_MAX = 80;
const ipRequestTimes = new Map();

function jsonResponse(body, status, origin, cacheSeconds = 0) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": cacheSeconds > 0 ? "public, max-age=" + cacheSeconds : "no-store"
  };
  return new Response(JSON.stringify(body), { status: status || 200, headers });
}

function allowOrigin(request, env) {
  const incoming = request.headers.get("Origin") || "";
  const configured = String(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",").map(value => value.trim()).filter(Boolean);
  // Requests without Origin include command-line monitoring; they still go through
  // method, input, rate, and provider checks and receive no permissive reflected origin.
  const allowed = !incoming || configured.includes(incoming);
  return { allowed, origin: incoming && allowed ? incoming : (configured[0] || "null") };
}

function isRateLimited(request, now = Date.now()) {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return false;
  const recent = (ipRequestTimes.get(ip) || []).filter(at => now - at < REQUEST_WINDOW_MS);
  if (recent.length >= REQUEST_LIMIT_PER_IP) {
    ipRequestTimes.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipRequestTimes.set(ip, recent);
  if (ipRequestTimes.size > 4000) {
    for (const [key, times] of ipRequestTimes.entries()) {
      if (!times.some(at => now - at < REQUEST_WINDOW_MS)) ipRequestTimes.delete(key);
    }
  }
  return false;
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isWebUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function sourceDomain(value) {
  try { return new URL(value).hostname.replace(/^www\./i, ""); } catch (_) { return ""; }
}

function extractSearchRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const candidates = [
    payload.results, payload.data, payload.items, payload.organic_results, payload.organic,
    payload.search_results, payload.web?.results, payload.data?.results
  ];
  for (const candidate of candidates) if (Array.isArray(candidate)) return candidate;
  return [];
}

function normalizeNewsRows(payload) {
  const rows = extractSearchRows(payload);
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const url = String(row.url || row.link || row.href || row.sourceUrl || "");
    if (!isWebUrl(url) || seen.has(url)) continue;
    const title = cleanText(row.title || row.name || row.headline || "", 240);
    if (!title) continue;
    seen.add(url);
    const rawDate = row.publishedAt || row.published_at || row.date || row.pubDate || row.published || null;
    let publishedAt = null;
    if (rawDate) {
      const stamp = Date.parse(String(rawDate));
      if (Number.isFinite(stamp)) publishedAt = new Date(stamp).toISOString();
    }
    items.push({
      id: url,
      title,
      snippet: cleanText(row.snippet || row.description || row.content || row.summary || "", 650),
      url,
      source: cleanText(row.source || row.publisher || sourceDomain(url), 100),
      publishedAt,
      publishedAtRaw: rawDate ? cleanText(rawDate, 100) : null,
      dateStatus: publishedAt ? "parsed-source-date" : "unconfirmed",
      evidenceStatus: "unverified-source-lead"
    });
    if (items.length >= 8) break;
  }
  return items;
}

function normalizeWorks(payload) {
  const rows = payload && Array.isArray(payload.results) ? payload.results : [];
  return rows.slice(0, 8).map(work => {
    const authors = (Array.isArray(work.authorships) ? work.authorships : [])
      .slice(0, 4).map(entry => cleanText(entry.author && entry.author.display_name, 100)).filter(Boolean);
    const host = work.primary_location && work.primary_location.source
      ? cleanText(work.primary_location.source.display_name, 180) : "";
    const landing = work.primary_location && work.primary_location.landing_page_url;
    const openAccess = work.open_access || {};
    const doiUrl = isWebUrl(work.doi) ? work.doi : "";
    const openalexUrl = work.id && isWebUrl(work.id) ? work.id : "";
    const url = isWebUrl(openAccess.oa_url) ? openAccess.oa_url
      : isWebUrl(landing) ? landing
      : doiUrl || openalexUrl;
    return {
      id: String(work.id || work.doi || work.title || ""),
      title: cleanText(work.title || "Untitled work", 300),
      year: Number.isFinite(Number(work.publication_year)) ? Number(work.publication_year) : null,
      type: cleanText(work.type || "work", 60),
      authors,
      source: host,
      doi: doiUrl || null,
      url: url || openalexUrl || "https://openalex.org/",
      openAlexUrl: openalexUrl || null,
      citedByCount: Number.isFinite(Number(work.cited_by_count)) ? Number(work.cited_by_count) : 0,
      isOpenAccess: Boolean(openAccess.is_oa),
      openAccessUrl: isWebUrl(openAccess.oa_url) ? openAccess.oa_url : null
    };
  }).filter(item => item.title);
}

async function cacheRead(key) {
  try {
    if (typeof caches === "undefined" || !caches.default) return null;
    const hit = await caches.default.match(key);
    if (!hit) return null;
    return await hit.json();
  } catch (_) {
    return null;
  }
}

async function cacheWrite(key, body, ttlSeconds, ctx) {
  try {
    if (typeof caches === "undefined" || !caches.default) return;
    const response = new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=" + ttlSeconds }
    });
    const write = caches.default.put(key, response);
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(write);
    else await write;
  } catch (_) { /* Cache failure must never suppress live results. */ }
}

function cacheKey(requestUrl, scope, site, country) {
  const key = new URL(requestUrl.origin + "/_cache/site-intel-v1");
  key.searchParams.set("scope", scope);
  key.searchParams.set("site", site.toLocaleLowerCase());
  key.searchParams.set("country", country.toLocaleLowerCase());
  return new Request(key.toString(), { method: "GET" });
}

function responseBody(scope, site, country, status, items, extra = {}) {
  return {
    schemaVersion: VERSION,
    site: { name: site, country: country || null },
    scope,
    provider: scope === "news" ? "TinyFish Search" : "OpenAlex",
    status,
    fetchedAt: new Date().toISOString(),
    count: items.length,
    items,
    provenance: {
      sourceUrl: scope === "news" ? "https://api.search.tinyfish.ai/" : "https://api.openalex.org/works",
      cachePolicy: scope === "news" ? "3 hours" : "24 hours",
      interpretation: scope === "news"
        ? "Search results are source leads. Verify the original publisher, date, location, and claims."
        : "Search ranking is approximate. Check the publication and abstract to confirm site-specific relevance."
    },
    ...extra
  };
}

async function fetchNews(site, country, env) {
  if (!env.TINYFISH_API_KEY) {
    return responseBody("news", site, country, "not_configured", [], {
      message: "TinyFish is not configured on this Worker. Add TINYFISH_API_KEY as a Worker secret."
    });
  }
  const query = [
    'Find recent public web/news sources about the UNESCO-designated place "' + site + '"',
    country ? "in " + country : "",
    "cover conservation, management, heritage protection, research, local communities, visitor impacts, climate and environmental change.",
    "Return concise search result titles, snippets, original publisher URLs, and publication dates when available.",
    "Prefer credible publishers and official organisations. Do not invent dates or sources."
  ].filter(Boolean).join(" ");
  const endpoint = new URL("https://api.search.tinyfish.ai/");
  endpoint.searchParams.set("query", query);
  try {
    const upstream = await fetch(endpoint.toString(), {
      method: "GET",
      headers: { "X-API-Key": env.TINYFISH_API_KEY, "Accept": "application/json" },
      signal: AbortSignal.timeout(12000)
    });
    if (!upstream.ok) {
      return responseBody("news", site, country, "upstream_error", [], {
        message: upstream.status === 429 ? "TinyFish rate limit reached; try again later."
          : "TinyFish returned HTTP " + upstream.status + "."
      });
    }
    const payload = await upstream.json();
    return responseBody("news", site, country, "ok", normalizeNewsRows(payload), {
      diagnostics: { rawResultCount: extractSearchRows(payload).length }
    });
  } catch (error) {
    const timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
    return responseBody("news", site, country, timedOut ? "timeout" : "unavailable", [], {
      message: timedOut ? "TinyFish search timed out. Retry later." : "TinyFish could not be reached. Retry later."
    });
  }
}

async function fetchResearch(site, country, env) {
  const endpoint = new URL("https://api.openalex.org/works");
  endpoint.searchParams.set("search", site);
  endpoint.searchParams.set("per-page", "8");
  endpoint.searchParams.set("select", "id,doi,title,publication_year,type,authorships,primary_location,cited_by_count,open_access");
  // The site name is the query, with country retained in visible provenance. Adding
  // country to the OpenAlex search can suppress relevant titles/keywords, so don't
  // silently AND it into the scholarly query.
  const headers = { "Accept": "application/json" };
  if (env.OPENALEX_API_KEY) headers.Authorization = "Bearer " + env.OPENALEX_API_KEY;
  try {
    const upstream = await fetch(endpoint.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(12000)
    });
    if (!upstream.ok) {
      return responseBody("research", site, country, "upstream_error", [], {
        message: upstream.status === 429 ? "OpenAlex usage limit reached. Cached results may be available later."
          : "OpenAlex returned HTTP " + upstream.status + "."
      });
    }
    const payload = await upstream.json();
    return responseBody("research", site, country, "ok", normalizeWorks(payload), {
      totalAvailable: Number(payload.meta && payload.meta.count || 0),
      query: site
    });
  } catch (error) {
    const timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
    return responseBody("research", site, country, timedOut ? "timeout" : "unavailable", [], {
      message: timedOut ? "OpenAlex search timed out. Retry later." : "OpenAlex could not be reached. Retry later."
    });
  }
}

export default {
  async fetch(request, env = {}, ctx = {}) {
    const url = new URL(request.url);
    const cors = allowOrigin(request, env);
    if (!cors.allowed) return jsonResponse({ error: "Origin not allowed" }, 403, "null");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": cors.origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    }});
    if (request.method !== "GET") return jsonResponse({ error: "Use GET" }, 405, cors.origin);
    if (url.pathname === "/health") return jsonResponse({ ok: true, service: "World Heritage Atlas Site Intelligence", version: VERSION }, 200, cors.origin);
    if (url.pathname !== "/site-intel") return jsonResponse({ error: "Not found" }, 404, cors.origin);
    if (isRateLimited(request)) return jsonResponse({ error: "Too many requests; wait a minute before retrying." }, 429, cors.origin);
    const site = cleanText(url.searchParams.get("site"), SITE_NAME_MAX);
    const country = cleanText(url.searchParams.get("country"), COUNTRY_MAX);
    const scope = String(url.searchParams.get("scope") || "news").toLowerCase();
    if (site.length < 2) return jsonResponse({ error: "A site name of at least two characters is required." }, 400, cors.origin);
    if (!["news", "research"].includes(scope)) return jsonResponse({ error: "scope must be news or research." }, 400, cors.origin);
    const requestKey = cacheKey(url, scope, site, country);
    const cached = await cacheRead(requestKey);
    if (cached) return jsonResponse({ ...cached, cached: true }, 200, cors.origin, 0);
    const body = scope === "news" ? await fetchNews(site, country, env) : await fetchResearch(site, country, env);
    const ttl = scope === "news" ? NEWS_TTL_SECONDS : RESEARCH_TTL_SECONDS;
    await cacheWrite(requestKey, body, ttl, ctx);
    return jsonResponse(body, 200, cors.origin, 0);
  }
};
