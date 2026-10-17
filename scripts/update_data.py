#!/usr/bin/env python3
"""Refresh UNESCO DataHub designations and World Bank tourism/economy series.

No API keys are required for these public endpoints. The script never edits curated
files such as data/sites.json or js/sites.js. It writes machine-generated snapshots
and normalized registries under data/generated/.

Examples:
  python scripts/update_data.py --scope all --force
  python scripts/update_data.py --scope unesco
  python scripts/update_data.py --scope economy --force
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "generated"
RAW_UNESCO = OUT / "raw" / "unesco"
RAW_WORLD_BANK = OUT / "raw" / "worldbank"
UNESCO_API = "https://data.unesco.org/api/explore/v2.1"
WORLD_BANK_API = "https://api.worldbank.org/v2"
USER_AGENT = "WorldHeritageAtlasDataBot/1.0 (+https://github.com/AnggaConni/SainsCultureBoardGame)"
PAGE_SIZE = 100
DEFAULT_YEARS = "2015:2025"

DATASETS = {
    "whc001": {
        "programme": "world_heritage",
        "title": "World Heritage List",
        "url": "https://data.unesco.org/explore/dataset/whc001/",
        "license": "CC BY-SA 4.0 as displayed on UNESCO DataHub; review specific terms before redistribution",
        "attribution": "UNESCO DataHub",
        "entity_type": "designated_site",
    },
    "eg0001": {
        "programme": "global_geopark",
        "title": "UNESCO Global Geoparks",
        "url": "https://data.unesco.org/explore/dataset/eg0001/",
        "license": "CC BY-SA 4.0 as displayed on UNESCO DataHub",
        "attribution": "UNESCO DataHub",
        "entity_type": "designated_geopark",
    },
    "mab001": {
        "programme": "biosphere_reserve",
        "title": "Man and the Biosphere Programme",
        "url": "https://data.unesco.org/explore/dataset/mab001/",
        "license": "CC BY-SA 4.0 as displayed on UNESCO DataHub",
        "attribution": "UNESCO DataHub",
        "entity_type": "designated_biosphere_reserve",
    },
    "ich001": {
        "programme": "intangible_cultural_heritage",
        "title": "Intangible Heritage List",
        "url": "https://data.unesco.org/explore/dataset/ich001/",
        "license": "Review current dataset licence/terms before redistribution",
        "attribution": "UNESCO DataHub",
        "entity_type": "intangible_heritage_element",
    },
    "cce001": {
        "programme": "creative_cities",
        "title": "Creative Cities List",
        "url": "https://data.unesco.org/explore/dataset/cce001/",
        "license": "Review current dataset licence/terms before redistribution",
        "attribution": "UNESCO DataHub",
        "entity_type": "creative_city",
    },
}

# World Bank WDI series include tourism indicators with source notes citing UN Tourism,
# plus comparable country-level economic context. They are NOT site-level tourism spend.
WORLD_BANK_INDICATORS = {
    "ST.INT.ARVL": "International tourism, number of arrivals",
    "ST.INT.RCPT.CD": "International tourism receipts (current US$)",
    "ST.INT.RCPT.XP.ZS": "International tourism receipts (% of total exports)",
    "NY.GDP.MKTP.CD": "GDP (current US$)",
    "SP.POP.TOTL": "Population, total",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def get_json(url: str, retries: int = 4) -> Any:
    """GET JSON with a polite user-agent, timeout and bounded retry for transient errors."""
    last_error: Exception | None = None
    for attempt in range(retries):
        request = Request(url, headers={
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        })
        try:
            with urlopen(request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            last_error = exc
            if exc.code not in (429, 500, 502, 503, 504) or attempt == retries - 1:
                raise
            retry_after = exc.headers.get("Retry-After")
            delay = int(retry_after) if retry_after and retry_after.isdigit() else 2 ** attempt
            time.sleep(min(delay, 30))
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt == retries - 1:
                raise
            time.sleep(min(2 ** attempt, 20))
    raise RuntimeError(f"Unable to GET JSON from {url}: {last_error}")


def cache_is_fresh(payload: Any, max_age_days: int) -> bool:
    if max_age_days <= 0 or not isinstance(payload, dict):
        return False
    fetched = payload.get("fetchedAt")
    if not fetched:
        return False
    try:
        when = datetime.fromisoformat(fetched.replace("Z", "+00:00"))
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - when.astimezone(timezone.utc) < timedelta(days=max_age_days)
    except ValueError:
        return False


def fetch_ods_records(dataset_id: str) -> tuple[list[dict[str, Any]], int]:
    """Fetch a complete dataset using the paginated Explore API v2.1 records endpoint."""
    records: list[dict[str, Any]] = []
    offset = 0
    total_count: int | None = None
    while True:
        query = urlencode({"limit": PAGE_SIZE, "offset": offset, "lang": "en", "timezone": "UTC"})
        url = f"{UNESCO_API}/catalog/datasets/{dataset_id}/records?{query}"
        payload = get_json(url)
        page = payload.get("results", []) if isinstance(payload, dict) else []
        if not isinstance(page, list):
            raise ValueError(f"Unexpected results type for UNESCO DataHub dataset {dataset_id}")
        if total_count is None and isinstance(payload, dict):
            raw_total = payload.get("total_count")
            total_count = int(raw_total) if isinstance(raw_total, (int, float)) else None
        records.extend(page)
        if not page or len(page) < PAGE_SIZE:
            break
        offset += len(page)
        if total_count is not None and offset >= total_count:
            break
        time.sleep(0.12)
    return records, total_count if total_count is not None else len(records)


def field_map(record: dict[str, Any]) -> dict[str, Any]:
    fields = record.get("fields")
    return fields if isinstance(fields, dict) else record


def first_value(fields: dict[str, Any], *names: str) -> Any:
    for name in names:
        value = fields.get(name)
        if value not in (None, "", [], {}):
            return value
    return None


def number(value: Any) -> float | None:
    try:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            found = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
            return float(found.group(0)) if found else None
    except (ValueError, TypeError):
        return None
    return None


def parse_point(value: Any, *, datahub_lat_lon: bool = True) -> dict[str, float] | None:
    """Normalize a point, defaulting UNESCO DataHub geodetic point arrays to [lat, lon]."""
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            parts = re.split(r"[,;\s]+", value.strip().strip("[]()"))
            value = parts if len(parts) >= 2 else None
    if isinstance(value, dict):
        lat = number(first_value(value, "lat", "latitude", "latitud"))
        lon = number(first_value(value, "lon", "lng", "longitude", "longitud"))
        if lat is not None and lon is not None and -90 <= lat <= 90 and -180 <= lon <= 180:
            return {"latitude": lat, "longitude": lon}
        coords = value.get("coordinates")
        return parse_point(coords, datahub_lat_lon=False) if coords is not None else None
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        a, b = number(value[0]), number(value[1])
        if a is None or b is None:
            return None
        lat, lon = (a, b) if datahub_lat_lon else (b, a)
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return {"latitude": lat, "longitude": lon}
    return None


def extract_coordinates(record: dict[str, Any], fields: dict[str, Any]) -> dict[str, float] | None:
    # GeoJSON geometry is [longitude, latitude]; DataHub "geo point" fields are [latitude, longitude].
    geom = record.get("geometry")
    if isinstance(geom, dict) and geom.get("type") == "Point":
        point = parse_point(geom.get("coordinates"), datahub_lat_lon=False)
        if point:
            return point
    for key in ("coordinates", "geo_point_2d", "geo_point", "location", "point"):
        if key in fields:
            point = parse_point(fields[key], datahub_lat_lon=True)
            if point:
                return point
    return None


def extract_year(fields: dict[str, Any]) -> int | None:
    value = first_value(fields, "date_inscribed", "date_inscription", "inscription_date",
                        "year_inscribed", "inscription_year", "year", "date")
    if isinstance(value, (int, float)) and 1000 <= int(value) <= 2100:
        return int(value)
    if value is not None:
        match = re.search(r"(?<!\d)(18\d{2}|19\d{2}|20\d{2}|2100)(?!\d)", str(value))
        if match:
            return int(match.group(0))
    return None


def normalized_record(dataset_id: str, record: dict[str, Any]) -> dict[str, Any]:
    config = DATASETS[dataset_id]
    fields = field_map(record)
    raw_id = first_value(fields, "id_no", "uuid", "mab_id", "geopark_id", "ich_id",
                         "element_id", "city_id", "identifier", "id")
    raw_id = raw_id or record.get("id") or record.get("recordid") or ""
    name = first_value(fields, "name_en", "title_en", "title", "name", "name_fr",
                       "element_en", "city_name", "geopark_name") or f"Unnamed record {raw_id}"
    country = first_value(fields, "states_names", "country_title_en", "country_name",
                          "country", "state_party", "state_names", "iso2", "iso3")
    category = first_value(fields, "category", "category_en", "type", "theme", "creative_field")
    web_url = first_value(fields, "url", "website", "official_url")
    coordinates = extract_coordinates(record, fields)
    extra_geometry = None
    for key in ("geo_shape", "geometry", "geom"):
        candidate = fields.get(key)
        if isinstance(candidate, str):
            try:
                candidate = json.loads(candidate)
            except json.JSONDecodeError:
                candidate = None
        if isinstance(candidate, dict) and candidate.get("type"):
            extra_geometry = candidate
            break
    record_url = config["url"]
    if dataset_id == "whc001" and str(raw_id).isdigit():
        record_url = f"https://whc.unesco.org/en/list/{raw_id}/"
    elif web_url and isinstance(web_url, str) and web_url.startswith(("https://", "http://")):
        record_url = web_url
    result = {
        "id": f"{dataset_id}:{raw_id}",
        "sourceId": str(raw_id),
        "name": str(name).strip(),
        "country": country,
        "category": category,
        "entityType": config["entity_type"],
        "programme": config["programme"],
        "coordinates": coordinates,
        "mapEligible": coordinates is not None,
        "geometry": extra_geometry,
        "year": extract_year(fields),
        "officialUrl": record_url,
        "source": {
            "datasetId": dataset_id,
            "datasetUrl": config["url"],
            "recordUrl": record_url,
            "attribution": config["attribution"],
            "license": config["license"],
        },
        "sourceUpdatedAt": first_value(fields, "updatedat", "updated_at", "modified", "last_updated"),
    }
    # Keep raw source fields available in each dataset snapshot, but avoid duplicating all
    # source fields in the cross-programme registry.
    return result


def fetch_unesco_dataset(dataset_id: str, force: bool, max_age_days: int) -> tuple[dict[str, Any], bool]:
    raw_path = RAW_UNESCO / f"{dataset_id}.json"
    cached = read_json(raw_path)
    if not force and cache_is_fresh(cached, max_age_days):
        print(f"[cache] UNESCO {dataset_id}: {cached.get('totalCount', 0)} records")
        return cached, False
    print(f"[fetch] UNESCO DataHub {dataset_id} ...")
    records, total = fetch_ods_records(dataset_id)
    payload = {
        "datasetId": dataset_id,
        "title": DATASETS[dataset_id]["title"],
        "datasetUrl": DATASETS[dataset_id]["url"],
        "apiUrl": f"{UNESCO_API}/catalog/datasets/{dataset_id}/records",
        "attribution": DATASETS[dataset_id]["attribution"],
        "license": DATASETS[dataset_id]["license"],
        "fetchedAt": utc_now(),
        "totalCount": total,
        "records": records,
    }
    write_json(raw_path, payload)
    normalized = [normalized_record(dataset_id, r) for r in records]
    normalized_payload = {
        "schemaVersion": "1.0.0",
        "programme": DATASETS[dataset_id]["programme"],
        "datasetId": dataset_id,
        "title": DATASETS[dataset_id]["title"],
        "source": DATASETS[dataset_id]["url"],
        "attribution": DATASETS[dataset_id]["attribution"],
        "license": DATASETS[dataset_id]["license"],
        "fetchedAt": payload["fetchedAt"],
        "totalCount": total,
        "records": normalized,
    }
    write_json(OUT / "unesco" / f"{dataset_id}.json", normalized_payload)
    print(f"[ok] UNESCO {dataset_id}: {len(records)} fetched / {total} reported")
    return payload, True


def get_world_bank_indicator(code: str, years: str, force: bool, max_age_days: int) -> tuple[dict[str, Any], bool]:
    safe_code = re.sub(r"[^A-Za-z0-9._-]", "", code)
    raw_path = RAW_WORLD_BANK / f"{safe_code}.json"
    cached = read_json(raw_path)
    if not force and cache_is_fresh(cached, max_age_days):
        print(f"[cache] World Bank {code}: {len(cached.get('records', []))} observations")
        return cached, False
    records: list[dict[str, Any]] = []
    page = 1
    pages = 1
    while page <= pages:
        params = urlencode({"format": "json", "date": years, "per_page": 20000, "page": page})
        url = f"{WORLD_BANK_API}/country/all/indicator/{safe_code}?{params}"
        payload = get_json(url)
        if not isinstance(payload, list) or len(payload) < 2:
            raise ValueError(f"Unexpected World Bank response for indicator {code}")
        meta = payload[0] if isinstance(payload[0], dict) else {}
        page_records = payload[1]
        if page_records is None:
            page_records = []
        if not isinstance(page_records, list):
            raise ValueError(f"Unexpected World Bank record list for indicator {code}")
        records.extend(page_records)
        pages = int(meta.get("pages", 1))
        page += 1
        if page <= pages:
            time.sleep(0.12)
    payload_out = {
        "indicatorCode": code,
        "indicatorName": WORLD_BANK_INDICATORS[code],
        "sourceUrl": f"{WORLD_BANK_API}/country/all/indicator/{safe_code}",
        "fetchedAt": utc_now(),
        "dateRange": years,
        "records": records,
    }
    write_json(raw_path, payload_out)
    print(f"[ok] World Bank {code}: {len(records)} observations")
    return payload_out, True


def normalize_world_bank(payload: dict[str, Any]) -> list[dict[str, Any]]:
    code = payload["indicatorCode"]
    result = []
    for row in payload.get("records", []):
        if not isinstance(row, dict) or row.get("value") is None:
            continue
        country = row.get("country") if isinstance(row.get("country"), dict) else {}
        indicator = row.get("indicator") if isinstance(row.get("indicator"), dict) else {}
        result.append({
            "countryCode": row.get("countryiso3code") or (row.get("country", {}).get("id") if isinstance(row.get("country"), dict) else None),
            "country": country.get("value"),
            "year": int(row["date"]) if str(row.get("date", "")).isdigit() else row.get("date"),
            "indicatorCode": code,
            "indicator": indicator.get("value") or WORLD_BANK_INDICATORS[code],
            "value": row.get("value"),
            "unit": row.get("unit") or None,
            "sourceNote": row.get("sourceNote") or None,
            "source": "World Bank World Development Indicators",
            "sourceUrl": payload["sourceUrl"],
            "retrievedAt": payload["fetchedAt"],
            "geographicScope": "country_level",
        })
    return result


def run(args: argparse.Namespace) -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    errors: list[dict[str, str]] = []
    manifest: dict[str, Any] = {
        "schemaVersion": "1.0.0",
        "generatedAt": utc_now(),
        "scope": args.scope,
        "force": args.force,
        "maxAgeDays": args.max_age_days,
        "sources": [],
        "warnings": [
            "Automated data is kept separately from data/sites.json. Human-reviewed model paths, educational copy and map anchors are not overwritten.",
            "World Bank tourism/economy indicators are country-level context, not evidence of an individual heritage site's economic contribution.",
            "Some UNESCO programmes do not provide a reliable point location for every record. Missing coordinates are preserved as null; records are not dropped.",
            "Check each dataset's current licence and attribution terms before republishing."
        ],
    }
    registry: list[dict[str, Any]] = []
    changed_count = 0
    if args.scope in ("all", "unesco"):
        for dataset_id, conf in DATASETS.items():
            try:
                payload, changed = fetch_unesco_dataset(dataset_id, args.force, args.max_age_days)
                changed_count += int(changed)
                normalized_path = OUT / "unesco" / f"{dataset_id}.json"
                normalized_payload = read_json(normalized_path)
                if normalized_payload is None or changed:
                    normalized = [normalized_record(dataset_id, r) for r in payload.get("records", [])]
                    normalized_payload = {
                        "schemaVersion": "1.0.0", "programme": conf["programme"],
                        "datasetId": dataset_id, "title": conf["title"], "source": conf["url"],
                        "attribution": conf["attribution"], "license": conf["license"],
                        "fetchedAt": payload.get("fetchedAt"), "totalCount": payload.get("totalCount", len(normalized)),
                        "records": normalized,
                    }
                    write_json(normalized_path, normalized_payload)
                registry.extend(normalized_payload.get("records", []))
                manifest["sources"].append({
                    "sourceId": dataset_id, "sourceType": "unesco_datahub",
                    "url": conf["url"], "status": "ok",
                    "recordCount": len(normalized_payload.get("records", [])),
                    "fetchedAt": normalized_payload.get("fetchedAt"),
                    "license": conf["license"], "attribution": conf["attribution"],
                })
            except Exception as exc:  # preserve other successful sources if one endpoint fails
                print(f"[error] UNESCO {dataset_id}: {exc}", file=sys.stderr)
                errors.append({"sourceId": dataset_id, "error": str(exc)})
                manifest["sources"].append({"sourceId": dataset_id, "url": conf["url"], "status": "error", "error": str(exc)})
    if args.scope in ("all", "economy"):
        economic_records: list[dict[str, Any]] = []
        successful_indicator_codes: set[str] = set()
        for code, label in WORLD_BANK_INDICATORS.items():
            try:
                payload, changed = get_world_bank_indicator(code, args.years, args.force, args.max_age_days)
                changed_count += int(changed)
                successful_indicator_codes.add(code)
                economic_records.extend(normalize_world_bank(payload))
                manifest["sources"].append({
                    "sourceId": code, "sourceType": "world_bank_indicator",
                    "url": payload["sourceUrl"], "status": "ok",
                    "indicator": label,
                    "recordCount": len(payload.get("records", [])),
                    "fetchedAt": payload.get("fetchedAt"),
                    "geographicScope": "country_level",
                })
            except Exception as exc:
                print(f"[error] World Bank {code}: {exc}", file=sys.stderr)
                errors.append({"sourceId": code, "error": str(exc)})
                manifest["sources"].append({"sourceId": code, "status": "error", "error": str(exc)})
        economics_path = OUT / "tourism_economics.json"
        previous = read_json(economics_path) or {}
        # Preserve observations from indicators outside the current scope/run, then replace
        # the indicator codes refreshed by this run.
        previous_records = previous.get("records", []) if isinstance(previous, dict) else []
        refreshed_codes = successful_indicator_codes
        merged = [r for r in previous_records if r.get("indicatorCode") not in refreshed_codes] + economic_records
        write_json(economics_path, {
            "schemaVersion": "1.0.0", "title": "Tourism and country-level economic context",
            "geographicScope": "country_level", "dateRange": args.years,
            "fetchedAt": utc_now(), "records": merged,
            "methodNote": "These macro indicators describe countries, not the economic impact of a specific UNESCO-designated site. Interpret them as contextual series only.",
        })
    if args.scope in ("all", "unesco"):
        write_json(OUT / "site_registry.json", {
            "schemaVersion": "1.0.0", "title": "UNESCO designation registry",
            "fetchedAt": utc_now(), "recordCount": len(registry), "mapEligibleCount": sum(1 for r in registry if r.get("mapEligible")),
            "records": registry,
            "programmeNote": "World Heritage sites, Global Geoparks, Biosphere Reserves, Intangible Cultural Heritage elements and Creative Cities are separate UNESCO designation programmes; do not merge them into one site category.",
        })
    manifest["generatedAt"] = utc_now()
    manifest["successCount"] = sum(1 for s in manifest["sources"] if s.get("status") == "ok")
    manifest["errorCount"] = len(errors)
    manifest["errors"] = errors
    write_json(OUT / "manifest.json", manifest)
    print(f"\nFinished. Sources OK: {manifest['successCount']}, errors: {manifest['errorCount']}, refreshed sources: {changed_count}")
    print(f"Machine-generated outputs: {OUT.relative_to(ROOT)}")
    return 1 if errors and manifest["successCount"] == 0 else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scope", choices=("all", "unesco", "economy"), default="all",
                        help="Refresh UNESCO designation feeds, economic indicators, or both.")
    parser.add_argument("--force", action="store_true",
                        help="Ignore local freshness checks and fetch all selected datasets again.")
    parser.add_argument("--max-age-days", type=int, default=25,
                        help="Use a recent local snapshot if it is younger than this many days (default: 25).")
    parser.add_argument("--years", default=DEFAULT_YEARS,
                        help="Year range for World Bank indicators, e.g. 2015:2025 (default: %(default)s).")
    return parser.parse_args()


if __name__ == "__main__":
    sys.exit(run(parse_args()))
