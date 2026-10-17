# 3D Asset Upload Guide

All 3D models belong in one folder: assets/models/. We keep temples, protected landscapes, wildlife, educational props and board-game tokens together so an upload does not require guessing which subfolder to use.

## Upload rules

1. Use a single binary glTF file with the .glb extension.
2. Use the exact lowercase filename from the checklist. Keep names in snake_case; do not use spaces, double underscores or uppercase characters.
3. Upload to the root of assets/models/ (not a new subfolder).
4. A .gltf download with external .bin or texture files is not a GLB. Open it in Blender and export through File → Export → glTF 2.0 → Format: GLB so dependencies are embedded.
5. Keep the model under 5 MiB when possible. The monthly audit warns on larger models; optimise high-poly meshes and textures before shipping to the browser.
6. Keep creator, source URL and licence records in data/asset_manifest.json and ASSET_CATALOG.md. “Free download” does not automatically mean public redistribution is allowed.
7. When an expected model is uploaded under its exact name, the next asset audit will mark that slot as present. New GLBs not yet registered will be listed as unregistered additions.

## A. Required for the current app — already present

| Final filename | Purpose | Status |
|---|---|---|
| assets/models/borobudur_temple.glb | Borobudur in the site explorer / board scene | Present; original provenance still needs verification |
| assets/models/artifact.glb | Board-game player token | Present |
| assets/models/statue_of_bastet.glb | Board-game player token | Present |
| assets/models/beach_environment.glb | Board-game coastal scene | Present |
| assets/models/school_building.glb | Board-game learning scene | Present |
| assets/models/african_hut.glb | Board-game environment prop | Present |

## B. UNESCO site models still to download

| Final filename to upload | Site / use | Suggested source or status |
|---|---|---|
| assets/models/prambanan_temple.glb | Prambanan / Candi Siwa | [Sketchfab — PixForge](https://sketchfab.com/3d-models/candi-siwa-prambanan-d7d633ba14be4ba7aeef1500f32e13f0), CC BY; AI-generated illustrative model; optimise before use |
| assets/models/komodo_dragon.glb | Main Komodo National Park model. The app streams a small preview directly from [3DAssets.dev](https://3dassets.dev/assets/reptiles-amphibians-and-minibeasts-komodo-dragon-9ed37a2d) under CC0 1.0. | [Open CC0 model and direct preview](https://cdn.3dassets.dev/assets/22431/v1/model.glb). A local copy is optional for self-hosting/offline use; if you add it, retain this exact filename. |
| assets/models/bali_subak_landscape.glb | Bali cultural landscape / subak | Find a suitable model and verify licence |
| assets/models/sangiran_fossil_display.glb | Sangiran fossil learning display | Find a suitable model and verify provenance/licence |
| assets/models/lorentz_highland_forest.glb | Lorentz highland ecosystem | Find a suitable model and verify licence |
| assets/models/borobudur_relief_3rd_floor.glb | Optional Borobudur relief close-up | [Sketchfab — PHAC](https://sketchfab.com/3d-models/borobudur-3rd-floor-relief-pictograph-2c49eeb628684757b8f0f87165a12007), CC BY; optional detail asset |

The Komodo dragon appears as a map-anchored 3D model at the park's approximate reference point. The visual scale is exaggerated for game discoverability and is not a survey-grade geospatial animal location. A procedural lizard illustration is used if the remote CC0 GLB preview cannot load. A true island/park terrain model is not included.

## C. Optional environment props

| Final filename | Purpose | Suggested source |
|---|---|---|
| assets/models/palm_tree.glb | Tropical vegetation prop | [Free Modular Islands Pack](https://marina-sunny-girl.itch.io/free-modular-islands-pack), CC0 pack; check exact asset |
| assets/models/coastal_rock.glb | Coastal rock prop | [Free Modular Islands Pack](https://marina-sunny-girl.itch.io/free-modular-islands-pack), CC0 pack; check exact asset |

## D. Existing models not currently referenced by the app

These files are preserved in assets/models/ so no existing binary is lost. The audit will flag them as stored but unreferenced until the game or a site catalog uses them.

- assets/models/egyptian_head.glb
- assets/models/classical_statue.glb
- assets/models/wounded_amazon_statue.glb

## Run the audit

Locally:

    python scripts/audit_assets.py

Force a fresh full inventory/hash scan:

    python scripts/audit_assets.py --force

The audit produces ASSET_AUDIT_REPORT.md at the repository root and stores the last inventory baseline in data/asset_audit_state.json. GitHub Actions runs it monthly and also supports a manual run through Actions → Monthly 3D Asset Audit → Run workflow.
