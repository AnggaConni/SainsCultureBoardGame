# Machine-generated dataset outputs

Run `python scripts/update_data.py --scope all --force` to refresh these outputs. The GitHub Actions workflow also runs monthly and can be forced from the Actions tab.

- `raw/unesco/{dataset_id}.json`: snapshots from UNESCO DataHub's Explore API v2.1.
- `unesco/{dataset_id}.json`: normalized records per designation programme.
- `site_registry.json`: combined registry for mapping and discovery, retaining designation programme identity and null coordinates when unavailable.
- `raw/worldbank/{indicator_code}.json`: source observations for World Bank WDI indicators.
- `tourism_economics.json`: normalized country/year tourism and macroeconomic context.
- `manifest.json`: source, attribution, license note, run time, counts and errors.

These files are refreshed externally sourced data. Do not manually store quiz questions, GLB paths or editorial notes in them. Those belong in curated `data/sites.json` and the educational content files. Check current dataset licences and attribution requirements before redistribution.

World Bank tourism indicators describe national-level trends, not spending or impacts attributable to a specific site.
