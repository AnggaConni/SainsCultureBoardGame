# 3D Asset Audit Report

Last checked: 2026-10-17T15:16:27+00:00
Run mode: FORCED full scan
Canonical model folder: assets/models/

**Overall status: PASS — runtime asset set complete; planned/optional assets remain outstanding.**

## Summary

| Check | Result |
|---|---:|
| GLB files present in assets/models/ | 9 |
| Required by current app | 6 / 6 present |
| UNESCO/site model slots | 1 / 8 present; 7 planned/optional missing |
| Optional environment props | 0 / 2 present |
| Unregistered model files | 0 |
| GLB files outside canonical folder | 0 |
| Invalid GLB containers | 0 |
| Non-standard filenames | 0 |
| Model files above recommended 5.00 MiB | 4 |
| Non-GLB files inside model folder | 0 |

## Current inventory

| Path | Size | GLB validation | Manifest role | Code reference |
|---|---:|---|---|---|
| assets/models/african_hut.glb | 9.34 MiB | PASS · optimize | African hut environment prop | Yes |
| assets/models/artifact.glb | 4.48 MiB | PASS | Board-game artifact token | Yes |
| assets/models/beach_environment.glb | 1.91 MiB | PASS | Beach / coastal environment | Yes |
| assets/models/borobudur_temple.glb | 2.27 MiB | PASS | Borobudur Temple | Yes |
| assets/models/classical_statue.glb | 8.21 MiB | PASS · optimize | Classical statue | No |
| assets/models/egyptian_head.glb | 13.55 MiB | PASS · optimize | Egyptian head statue | No |
| assets/models/school_building.glb | 422.5 KiB | PASS | Low-poly school building | Yes |
| assets/models/statue_of_bastet.glb | 2.00 MiB | PASS | Statue of Bastet player token | Yes |
| assets/models/wounded_amazon_statue.glb | 10.77 MiB | PASS · optimize | Wounded Amazon statue | No |

## Runtime-required assets

| Final filename | Status | Used by |
|---|---|---|
| assets/models/borobudur_temple.glb | PRESENT | js/board.js, js/sites.js, data/sites.json |
| assets/models/artifact.glb | PRESENT | js/board.js |
| assets/models/statue_of_bastet.glb | PRESENT | js/board.js |
| assets/models/beach_environment.glb | PRESENT | js/board.js |
| assets/models/school_building.glb | PRESENT | js/board.js |
| assets/models/african_hut.glb | PRESENT | js/board.js |

## Missing planned / optional files

Upload each file to the exact path shown. Use a single .glb with embedded textures.

| Expected filename | Priority | Subject | Source / note |
|---|---|---|---|
| assets/models/prambanan_temple.glb | planned | Prambanan / Candi Siwa | [Source](https://sketchfab.com/3d-models/candi-siwa-prambanan-d7d633ba14be4ba7aeef1500f32e13f0) — CC BY; verify current terms; AI-generated illustrative model, optimize before web deployment |
| assets/models/komodo_island.glb | present — optional detail model | Elin tropical island scene | [Source](https://sketchfab.com/3d-models/tropical-island-f91862f8c38b481aa19edccac851eefb) — CC BY; attribution required |
| assets/models/komodo_dragon.glb | optional local copy | Komodo dragon map model (remote CC0 preview active) | [3DAssets.dev model and CC0 1.0 licence](https://3dassets.dev/assets/reptiles-amphibians-and-minibeasts-komodo-dragon-9ed37a2d) |
| assets/models/bali_subak_landscape.glb | planned | Bali subak landscape | Source to be identified — To be confirmed |
| assets/models/sangiran_fossil_display.glb | planned | Sangiran fossil learning display | Source to be identified — To be confirmed |
| assets/models/lorentz_highland_forest.glb | planned | Lorentz highland forest | Source to be identified — To be confirmed |
| assets/models/borobudur_relief_3rd_floor.glb | optional | Borobudur relief detail | [Source](https://sketchfab.com/3d-models/borobudur-3rd-floor-relief-pictograph-2c49eeb628684757b8f0f87165a12007) — CC BY; verify current terms and attribution at source |
| assets/models/palm_tree.glb | optional | Palm tree prop | [Source](https://marina-sunny-girl.itch.io/free-modular-islands-pack) — CC0 (check exact source item) |
| assets/models/coastal_rock.glb | optional | Coastal rock prop | [Source](https://marina-sunny-girl.itch.io/free-modular-islands-pack) — CC0 (check exact source item) |

## Unsupported file formats in assets/models

- None


## New, changed and removed since previous audit

Initial baseline: additions and removals will be comparable from the next audit onwards.

No previous inventory existed. This scan creates the first baseline; it does not label all existing files as new.
## Findings and cleanup candidates

- No unregistered GLB is currently present in the canonical model folder.

### Present but not referenced in executable code

These files are retained rather than deleted automatically. Decide whether to reuse or remove them in a separate reviewed change.

- assets/models/classical_statue.glb — 8.21 MiB
- assets/models/egyptian_head.glb — 13.55 MiB
- assets/models/wounded_amazon_statue.glb — 10.77 MiB

### Optimisation warnings

Recommended maximum is 5.00 MiB. Large files may load slowly in GitHub Pages / browser gameplay.

- assets/models/african_hut.glb — 9.34 MiB
- assets/models/classical_statue.glb — 8.21 MiB
- assets/models/egyptian_head.glb — 13.55 MiB
- assets/models/wounded_amazon_statue.glb — 10.77 MiB

## What this audit does not do

- It only checks files already in the repository; it does not search for or download new 3D models.
- It cannot confirm copyright/licence permission, archaeological accuracy, topology quality, texture appearance or in-game scale.
- New files placed in assets/models/ are reported; register their purpose and licence in data/asset_manifest.json after review.

Full filename list and upload steps: ASSET_UPLOAD_GUIDE.md. Canonical metadata: data/asset_manifest.json.


## Komodo dragon preview note
The app now streams a small CC0 Komodo dragon GLB from 3DAssets.dev with a procedural 3D lizard fallback. The local file `assets/models/komodo_dragon.glb` remains an optional self-hosted copy; the monthly audit reports it if it is not uploaded locally.


## Recently uploaded Komodo models
- `assets/models/komodo_dragon.glb` — present (6,139,136 bytes); used by the on-map Komodo overlay. Above the recommended 5 MiB budget; optimize if browser loading is slow.
- `assets/models/komodo_island.glb` — renamed from `elin.glb` (14,913,384 bytes); available to the Komodo site-detail viewer as an illustrative tropical-island scene. Above the recommended size; optimize for web before broad public rollout.
- The names in this report are based on the latest repository inventory. A fresh scheduled/manual audit will verify GLB chunk integrity and refresh the SHA-256 baseline.
