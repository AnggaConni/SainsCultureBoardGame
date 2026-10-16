# Sains & Culture Board Game

Browser-based educational adventure board game prototype. This milestone focuses on a 500-tile winding route, modular quiz data, placeholder player tokens, and a separate HTML mini-game that sends results back to the main game.

## Run locally

Open `index.html` in a modern browser. For reliable local testing, run a static server from the repository root (for example, `python -m http.server 8000`) and visit `http://localhost:8000`.

## Current prototype

- 500 numbered square placeholder tiles sampled along a winding SVG path.
- Two local players, dice, turn switching, progress and reset.
- A starter Borobudur quiz, also stored in `data/quizzes/borobudur.json`.
- Separate `minigames/data-test.html` embedded in a modal iframe.
- Mini-game result payload uses `window.parent.postMessage`; parent checks origin and applies a three-tile penalty to the loser.
- Zones and folders prepared for future 3D assets.

## Structure

```text
index.html
css/                 # Main and mini-game styles
js/                  # Board, game and mini-game logic
data/
  board-config.json
  quizzes/borobudur.json
minigames/data-test.html
assets/
  temples/            # Borobudur, temples, stupas, reliefs
  players/            # Avatars and player tokens
  ocean/              # Ocean and marine-life assets
  nature/             # Jungle, plants and wildlife
  environment/        # Science environments and props
  ui/                 # Icons and interface graphics
  audio/              # Sound and music
  placeholders/       # Temporary visual assets
```

## Asset conventions

Prefer GLB/GLTF for 3D models and WebP/PNG for previews and textures. Record source URL, creator, license and attribution requirements in the relevant folder README before shipping assets. No 3D models are bundled yet.

## Next milestones

1. Approve route shape and tile spacing.
2. Replace temporary tile trigger rules with explicit tile metadata.
3. Improve movement animation and detection when players meet.
4. Expand quiz banks for science, education and culture.
5. Integrate 3D assets only after the base board is stable.

This is an early prototype for local same-device multiplayer, not online synchronized multiplayer.