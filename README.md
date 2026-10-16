# Sains & Culture 3D Adventure Board Game

An immersive, browser-based educational adventure board game with a winding 500-tile 3D route. The interface is designed as a full-screen Three.js world with lightweight HUD overlays rather than a side command center.

## Open the game

After GitHub Pages deploys the repository, open:
https://anggaconni.github.io/SainsCultureBoardGame/

You can also run it locally from the repository root using a static server, for example `python -m http.server 8000`, and open `http://localhost:8000`.

## Prototype features

- Full-screen Three.js 3D scene, perspective camera, orbit and zoom controls.
- 500 individually numbered tile meshes sampled evenly along a designed serpentine route, with visible gaps and a central rocky clearing.
- Four themed zones: Ancient Civilization, Ocean World, Jungle Expedition, and Science Frontier.
- GLB asset loading for Borobudur, beach/education environments, and player tokens, with simple fallback geometry for characters and the temple.
- Tile hover/click information.
- Two-player local turn-based dice game.
- Borobudur quiz and a separate HTML mini-game connected using `postMessage`.
- On a valid mini-game result, the losing player moves back three tiles.

## Main files

```text
index.html                    Full-screen game shell and HUD
css/style.css                 Immersive overlay styling
js/board.js                   Three.js scene, 500 tiles, GLB assets, camera
js/game.js                    Turns, dice, quiz, mini-game handshake
minigames/data-test.html      Standalone mini-game test
js/minigame-data-test.js      Mini-game scoring and result messaging
data/board-config.json        Board and zone metadata
data/quizzes/borobudur.json   Starter quiz bank
assets/temples/               Borobudur and temple GLB assets
assets/players/               Player GLB assets
assets/ocean/                 Ocean and beach assets
assets/nature/                Nature assets
assets/environment/           Environment assets
assets/ui/                    UI assets
assets/audio/                 Audio assets
assets/placeholders/          Temporary assets
```

## Interaction

Drag to rotate the camera, scroll to zoom, and click a tile to inspect its zone. Roll the dice to move. Quiz tiles appear on the route; meeting the other player can launch the mini-game duel.

## Notes

This is an early prototype and has not yet been browser-tested end-to-end after the current full-screen 3D update. GLB model scale/orientation and the detailed terrain transitions will need visual tuning. No online multiplayer synchronization is included yet.