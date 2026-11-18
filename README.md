# SimpleFold paper presentation

A 13-slide reveal.js deck for the computational biology paper presentation on *SimpleFold: Folding Proteins is Simpler than You Think* (Wang et al., Apple, arXiv 2509.18480). The target length is about 17 minutes.

## Present

Open `index.html` in Chrome or Safari. Speaker notes are not in the deck: they live only on the Notion page "SimpleFold - Speaker Notes" (child of the paper notes page), which Tygo edits and prints. Double-clicking the file works because every library and asset is stored locally, so the deck needs no internet or local server.

| Key | Action |
|---|---|
| → / space | next step (fragments, then slides) |
| F | fullscreen |
| Esc / O | slide overview |

Interactive parts:
- **Slide 1:** press → to show the question and fold the noise cloud. Click the canvas to replay.
- **Slide 6:** flow-matching toy with Training/Sampling buttons, Play, and a slider for t. After using the slider, arrow keys go back to the deck.
- **Slide 13:** the folding animation replays on its own. Click to replay.

PDF backup: open `index.html?print-pdf` in Chrome, then Print and Save as PDF (landscape, no margins). The animations export as their last frame.

## Layout

```
index.html            slides
css/deck.css          theme (light, Source Serif 4 / IBM Plex)
js/fold-anim.js       noise -> structure renderer (slides 1, 5, 12)
js/flow-toy.js        2D flow-matching toy (slide 6)
js/deck.js            static figures, reveal.js / KaTeX / 3Dmol wiring
assets/data/ttr.js    SimpleFold-3B prediction + PDB 7RLK chain D (generated)
assets/data/wave.js   Hokusai image as data URL (canvas reads work from file://)
assets/img/           paper figures (arXiv HTML v4) and crops
vendor/               reveal.js 5.2.1, 3Dmol 2.5.5, KaTeX 0.19.1, fonts
data/                 scripts that produced assets/data (raw downloads gitignored)
tools/shoot.py        renders every slide to PNG and lists console errors
```

Regenerate the protein data with `cd data && python3 export_ttr.py`. This needs `gemmi` and `numpy`, plus Apple's `cameo22_predictions.zip` and the PDB entry 7RLK in `data/raw/`. See NOTES.md.
