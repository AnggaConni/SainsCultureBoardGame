# Ambient music

The playlist is configured in **`music/playlist.json`**. The player does not maintain a separate hard-coded track list in JavaScript.

## Add a track

1. Upload the audio file to the correct folder:
   - `music/framelens/` for a track whose owner has confirmed non-commercial standard/non-HD use.
   - `music/cc4/` for a track that is individually licensed under CC BY 4.0.
2. Edit `music/playlist.json` and append an entry under `tracks`. The `src` value is relative to the `music/` folder, for example `cc4/my-track.mp3`—do not prefix it with `music/`.
3. Add a unique `id`, a title, source URL, credit, and a short detail. The app automatically shows the folder-level Framelens credit or the individual CC BY track credit according to `folders[folder].creditMode`.
4. Commit the MP3 and JSON together. GitHub Pages will then publish the file and the player will load it from the playlist.

## Playlist file structure

- `defaultVolume`: initial player volume from 0 to 1 (currently 0.4 = 40%).
- `folders`: attribution display rules for `framelens` and `cc4`.
- `tracks`: editable list of track metadata. Each track's `src` must point inside the matching subfolder.

## Current playlist

1. Sound of Orchestra Java — Framelens ID, standard MP3/non-commercial permission.
2. Fiddle-De-Dee — Shane Ivers, CC BY 4.0.
3. Al Andalus — Shane Ivers, CC BY 4.0.
4. All The Tea In China — Shane Ivers, CC BY 4.0.
5. The Medieval Banquet — Shane Ivers, CC BY 4.0.

Every CC BY track must retain its individual attribution. A “no copyright” title alone does not establish a licence.
