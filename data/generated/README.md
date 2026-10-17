# Machine-generated dataset outputs

Run `python scripts/update_data.py --scope all --force` to refresh these outputs. The GitHub Actions workflow also runs monthly and can be forced from the Actions tab.

- `raw/unesco/{dataset_id}.json`: raw snapshots from UNESCO DataHub's Explore API v2.1; archived as a GitHub Actions artifact for 30 days, not committed to Git history.
- `unesco/{dataset_id}.json`: compact normalized records per designation programme; committed to the repository.
- `site_registry.json`: compact combined registry for mapping/discovery; committed to the repository.
- `raw/worldbank/{indicator_code}.json`: source observations archived as a workflow artifact for 30 days, not committed to Git history.
- `tourism_economics.json`: compact normalized country/year tourism and macroeconomic context; committed to the repository.
- `manifest.json`: source, attribution, licence note, run time, counts and errors; committed to the repository.

Download the raw snapshots from the relevant workflow run's **Artifacts** section. This keeps large source payloads available for audit without expanding Git history every refresh.

These files are refreshed externally sourced data. Do not manually store quiz questions, GLB paths or editorial notes in them. Those belong in curated `data/sites.json` and the educational content files. Check current dataset licences and attribution requirements before redistribution.

World Bank tourism indicators describe national-level trends, not spending or impacts attributable to a specific site.
