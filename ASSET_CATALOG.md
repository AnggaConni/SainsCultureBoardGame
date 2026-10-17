# World Heritage Atlas — Phase 1 asset download checklist

This project expects **local GLB files**, not links embedded from third-party viewers. Upload each asset into the repository at the exact path below; the site's 3D Model panel reads the path from `js/sites.js`.

## Phase 1 — download these first

| Priority | What to download | Source / license | Save as |
|---|---|---|---|
| 1 | **Borobudur temple complex** — no new download required for initial testing: this file already exists in this repository. However, its creator and license are not documented in the old asset README, so verify provenance before public institutional use or redistribution. | Existing file; provenance pending | `assets/temples/borobudur_temple.glb` |
| 2 | **Candi Siwa Prambanan** by PixForge. Free download on Sketchfab, **CC BY**. The listing says it is AI-generated and has about 1.7 million triangles; treat it as an illustrative asset, not a verified archaeological reconstruction. Decimate it in Blender before web use. | [Download on Sketchfab](https://sketchfab.com/3d-models/candi-siwa-prambanan-d7d633ba14be4ba7aeef1500f32e13f0) — attribution required | `assets/temples/prambanan_temple.glb` |
| 3 | **Tropical Island** by Elin. A generic island scene optimized for mobile VR, about 112k triangles. Use it as a *stylized learning environment* for the Komodo expedition, **not** as a faithful geographic model of Komodo Island. | [Download on Sketchfab](https://sketchfab.com/3d-models/tropical-island-f91862f8c38b481aa19edccac851eefb) — **CC BY**, attribution required | `assets/landscapes/komodo_island.glb` |
| 4 | **Komodo Dragon** by all of life. Downloadable model, about 44k triangles. | [Download on Sketchfab](https://sketchfab.com/3d-models/komodo-dragon-0b8679521991420a8b48a6e63018f52c) — **CC BY**, attribution required | `assets/nature/komodo_dragon.glb` |
| 5 | **Borobudur 3rd Floor Relief Pictograph** by PHAC, a scanned detail object around 50k triangles. Optional bonus asset for a close-up relief learning mission. The listing carries a NoAI restriction; this is relevant if you plan any AI training/use, not ordinary display in this game. | [Download on Sketchfab](https://sketchfab.com/3d-models/borobudur-3rd-floor-relief-pictograph-2c49eeb628684757b8f0f87165a12007) — **CC BY**, attribution required | `assets/temples/borobudur_relief_3rd_floor.glb` |

The two Sketchfab temple/animal assets with CC BY licences require creator attribution, a link to the source/licence, and an indication if you modified the model. Keep the attribution in this file (or an in-app credits panel) when releasing the game.

## Phase 1 optional — nature props

- [Free Modular Islands Pack](https://marina-sunny-girl.itch.io/free-modular-islands-pack) — 55 models, including GLB, **CC0**. Use selected small props/vegetation for a stylized island. Rename only the individual models you actually use, e.g. `assets/nature/palm_tree.glb`, `assets/nature/coastal_rock.glb`. CC0 means attribution is not required, but recording the source is still useful.
- [Poly Haven](https://polyhaven.com/) — HDRIs, materials and models, all CC0. Good for scene lighting and material polish; assets are generally okay for personal or commercial use under CC0, but check the asset page and use the file's actual format.

## Planned slots for later phases

These paths are already registered as placeholders in the site journal. Do not download random files and call them historically accurate; pick an appropriate model, check its license and provenance, then upload:
- `assets/landscapes/bali_subak_landscape.glb` — an illustrative Bali rice-terrace/subak scene.
- `assets/heritage/sangiran_fossil_display.glb` — a fossil/specimen display appropriate for Sangiran learning.
- `assets/landscapes/lorentz_highland_forest.glb` — a highland forest/mountain environment for Lorentz National Park.

For a **geographically accurate Komodo landscape**, a generic island mesh is not enough. A later phase can derive a terrain mesh from an open DEM such as [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM); that requires cropping/processing the elevation raster and building/exporting a mesh, not just renaming a downloaded model.

## File rules — read before uploading

1. Save the final asset as **GLB (.glb)**, a single binary glTF file. If a Sketchfab download is a ZIP containing `.gltf`, `.bin`, and texture files, do **not** merely rename `.gltf` to `.glb`. Import the downloaded scene into Blender, then use **File → Export → glTF 2.0 → Format: GLB** so textures are embedded.
2. Use lowercase names and exact paths. GitHub Pages is case-sensitive.
3. For web performance, target **under 5 MB per GLB** and preferably under **200,000 triangles** for each interactive site model. Larger models can be decimated and their textures reduced to 1K/2K in Blender.
4. Upload the files and commit them. GitHub Pages will serve them at the paths above after deployment; reload the site and open the site drawer → **Explore this place in 3D** → choose the model → **Open 3D**.
5. The local viewer supports rotate (drag), zoom (scroll/pinch), and reset view. It does not geo-place the GLB on the globe; it opens a separate, normalized local scene in the site journal.
6. “Free download” does not mean “public-domain.” Observe each file's licence. Avoid redistributing models marked NonCommercial if the project may later become commercial or institutionally sponsored.

## Attribution notes

- Komodo Dragon — all of life, Sketchfab, [source](https://sketchfab.com/3d-models/komodo-dragon-0b8679521991420a8b48a6e63018f52c), CC BY. Verify the exact Creative Commons version displayed on the download page when downloading.
- Tropical Island — Elin, Sketchfab, [source](https://sketchfab.com/3d-models/tropical-island-f91862f8c38b481aa19edccac851eefb), CC BY. Verify the exact licence version displayed at download.
- Candi Siwa Prambanan — PixForge, Sketchfab, [source](https://sketchfab.com/3d-models/candi-siwa-prambanan-d7d633ba14be4ba7aeef1500f32e13f0), CC BY. Model is AI-generated; do not present as an official scan or exact restoration.
- Borobudur relief — PHAC, Sketchfab, [source](https://sketchfab.com/3d-models/borobudur-3rd-floor-relief-pictograph-2c49eeb628684757b8f0f87165a12007), CC BY with NoAI tag on its listing.

Always check the original download page one more time before publishing; model availability and terms can change.


## Site coordinates and the 3D globe

The curated `data/sites.json` now separates site identity from quizzes. A site record can carry a representative WGS84 point, programme/designation information, camera range, and one or more model assets. Models marked `placement: "globe"` can be rendered at map coordinates; `placement: "detail"` is loaded into the separate 3D viewer.

Target sizes such as Borobudur's approximately 35 m display height are sizing targets to normalize the visual model, not a claim that the repository GLB's dimensions have been measured or archaeologically verified. The model's origin/heading/footprint should be checked visually before institutional publication.


## Cesium crash-isolation note
The current Borobudur GLB is listed with `placement: "detail"` and loads through the separate Three.js viewer. It is not attached to Cesium's native model renderer until compatibility is tested. Hover over a map pin for a site tooltip; click the pin to open the site journal and local 3D asset viewer.
