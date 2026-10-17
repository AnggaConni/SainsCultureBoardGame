# 3D Asset Audit Report

Last inspected: 2026-10-17  
Folder: assets/models/  
Method: repository tree inspection before the first automated baseline run.

## Summary

| Check | Result |
|---|---:|
| GLB files currently present | 9 |
| Required for current application | 6 / 6 found |
| Planned UNESCO/site models | 1 / 8 found; 7 missing |
| Optional environment props | 0 / 2 found |
| Existing but not currently referenced models | 3 |
| GLB files outside assets/models/ | 0 after consolidation |
| Unregistered GLB files | 0 in the initial manifest |
| Invalid GLB container checks | Pending first Python audit run |

This is a manually prepared starting report. Run the audit workflow to create the first SHA-256 inventory baseline; subsequent runs will identify newly added, changed and removed model files.

## Required runtime assets

| File | Status | Size |
|---|---|---:|
| assets/models/borobudur_temple.glb | Present; source licence needs review | 2,379,592 bytes |
| assets/models/artifact.glb | Present | 4,693,620 bytes |
| assets/models/statue_of_bastet.glb | Present | 2,101,512 bytes |
| assets/models/beach_environment.glb | Present | 2,004,052 bytes |
| assets/models/school_building.glb | Present | 432,600 bytes |
| assets/models/african_hut.glb | Present; optimise for web | 9,797,956 bytes |

## Site models still missing

Upload to the exact path shown:

| Expected filename | Purpose |
|---|---|
| assets/models/prambanan_temple.glb | Prambanan / Candi Siwa |
| assets/models/komodo_island.glb | Illustrative tropical island environment |
| assets/models/komodo_dragon.glb | Komodo wildlife learning asset |
| assets/models/bali_subak_landscape.glb | Bali cultural landscape |
| assets/models/sangiran_fossil_display.glb | Sangiran fossil learning display |
| assets/models/lorentz_highland_forest.glb | Lorentz ecosystem |
| assets/models/borobudur_relief_3rd_floor.glb | Optional Borobudur relief detail |

## Optional props still missing

- assets/models/palm_tree.glb
- assets/models/coastal_rock.glb

## Present but not referenced by current game/site code

These are retained rather than deleted so existing binary assets are not lost:

- assets/models/egyptian_head.glb — 14,204,616 bytes; optimise before web use.
- assets/models/classical_statue.glb — 8,614,000 bytes.
- assets/models/wounded_amazon_statue.glb — 11,293,532 bytes; optimise before web use.

## Licence and scale warnings

Several inherited board-game models do not have creator/licence details documented in the repository. Before public or institutional distribution, check each original source and add attribution. The audit can verify file/container metadata and folder structure, but cannot determine licence permission or whether a model is historically accurate.
