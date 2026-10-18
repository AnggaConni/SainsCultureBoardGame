# Ambient music (stable setup)

The current music player uses the five-track list in `js/app.js` as it did before the attempted JSON playlist refactor. This is the stable fallback version. `music/playlist.json` is no longer used by the player.

The audio files stay in these folders:
- `framelens/` — Framelens ID, owner-confirmed non-commercial use of standard/non-HD MP3 only. Display credit: **Music by framelens_id**.
- `cc4/` — tracks released under CC BY 4.0. Preserve the individual track credit and source URL.

## Current playlist in js/app.js

1. Sound of Orchestra Java — Framelens ID.
2. Fiddle-De-Dee — Shane Ivers, CC BY 4.0.
3. Al Andalus — Shane Ivers, CC BY 4.0.
4. All The Tea In China — Shane Ivers, CC BY 4.0.
5. The Medieval Banquet — Shane Ivers, CC BY 4.0.

Playback starts after the first interaction when permitted by the browser. The default volume is 40%; play/pause, random next and volume controls are supported.

For now, leave the playlist list in `js/app.js` unchanged while validating the map rollback. The existing audio files and attribution notes remain in place. A new JSON-driven playlist can be reintroduced separately once the map is confirmed stable.
