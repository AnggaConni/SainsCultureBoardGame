# Data pipeline and source governance

## Sources refreshed

The Python connector uses the public UNESCO DataHub Explore API v2.1 records endpoint to obtain these datasets:

| Dataset ID | Programme | Record type | Map caveat |
|---|---|---|---|
| whc001 | World Heritage List | Cultural, natural and mixed properties | A point is not the site's boundary |
| eg0001 | UNESCO Global Geoparks | Geoparks | Centre points are not official boundaries |
| mab001 | Man and the Biosphere | Biosphere reserves | Some records may not have a point |
| ich001 | Intangible Cultural Heritage | Practices, skills and expressions | Elements may be country-associated, not point-based |
| cce001 | Creative Cities Network | Designated cities | A city point is not a boundary |

The script also calls the World Bank Indicators API for ST.INT.ARVL (international tourism arrivals), ST.INT.RCPT.CD (tourism receipts), ST.INT.RCPT.XP.ZS (tourism receipts as a share of exports), NY.GDP.MKTP.CD (GDP) and SP.POP.TOTL (population). These are country-level context, not impacts attributable to an individual site.

## Running it

- Force complete refresh: python scripts/update_data.py --scope all --force
- UNESCO feeds only: python scripts/update_data.py --scope unesco --force
- Economy and tourism only: python scripts/update_data.py --scope economy --force
- Use local source caches younger than 25 days: python scripts/update_data.py --scope all
- Run offline parser tests: python scripts/test_update_data.py

GitHub Actions runs on the first day of each month at 03:17 UTC. Use Actions → Refresh UNESCO and tourism data → Run workflow for a manual run. The manual workflow has scope and force-refresh controls.

## Separation of concerns

- data/sites.json: curated site coordinates, designation metadata, model paths/target dimensions, provenance and educational copy. The fetcher does not rewrite it.
- data/generated/raw/unesco/: original dataset snapshots for traceability.
- data/generated/unesco/: normalized files, one per designation programme.
- data/generated/site_registry.json: consolidated multi-programme registry.
- data/generated/raw/worldbank/: World Bank raw observations by indicator.
- data/generated/tourism_economics.json: normalized country/year/indicator series.
- data/generated/manifest.json: source status, fetch times, counts, attribution/license notes and errors.

## Future connectors

New adapters can be added beside the UNESCO and World Bank adapters, writing into their own generated files. Candidates:
- GBIF for biodiversity occurrence context.
- OpenTripMap for nearby points of interest (requires an API key).
- National statistics offices for site-specific visitation and ticketing.
- UN Tourism's direct statistics platform, only through a documented and permitted access method.

Do not assume a source is open/free or redistributable because a URL is publicly visible.

## Licence and provenance

UNESCO DataHub dataset pages list dataset identifiers and licence/attribution information. Preserve source URL, retrieval time, programme and licence note. Some DataHub programme datasets display CC BY-SA 4.0; others must be checked against their current record. The World Heritage DataHub page links to the World Heritage Centre's conditions of use. Prefer the published DataHub API over scraping non-syndicated World Heritage Centre pages, and confirm terms before public redistribution.

## Model scale and map anchor

Borobudur's existing GLB is placed at the curated representative coordinate in data/sites.json. The viewer measures its GLB vertical bounds and normalizes it to a 35 m target display height. This is an editable visual target, not verification of the downloaded model's archaeological accuracy or measured dimensions. The model's lower bound is raised to the map ellipsoid surface; current OSM tiles do not provide surveyed terrain elevation or property boundaries.
