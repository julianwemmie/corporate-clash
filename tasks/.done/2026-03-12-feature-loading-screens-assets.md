---
status: done
type: feature
created: 2026-03-12
---

# Add loading screens while assets are loading

Images take a bit of time to load. We should add loading screens to display while assets are being loaded to improve the user experience.

## Approach

HTML/CSS overlay loading screen that appears after the player clicks "Join" but before the game renders. Preloads all assets upfront using Pixi's `Assets.load`, displays a real progress bar, and cycles through funny corporate loading messages. Fades out to reveal the game when done.

## Key decisions

- **Upfront preload** — all assets load before the game starts, no lazy loading or pop-in
- **HTML/CSS overlay** — no dependency on Pixi being ready first, easy to style
- **Real progress tracking** — progress bar reflects actual asset loading state via `Assets.load` onProgress
- **Corporate humor messages** — curated set of 5-8 satirical messages rotating during load (e.g. "Synergizing workflows...")
- **Fade-out transition** — smooth ~500ms opacity fade when loading completes

## Implementation steps

- [ ] Collect all asset paths into a single manifest (currently scattered across MapManager and AlertManager)
- [ ] Build the HTML overlay with progress bar and rotating message text
- [ ] Wire up `Assets.load` with an `onProgress` callback to drive the progress bar
- [ ] Add 5-8 corporate humor loading messages that cycle during load
- [ ] Add fade-out transition (~500ms) and remove the overlay from DOM when done
- [ ] Remove lazy loading from MapManager/AlertManager since assets are now preloaded
