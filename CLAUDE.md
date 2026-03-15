# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build
npx vite --host    # Expose dev server on local network (for projector on another device)
```

No test or lint commands are configured.

## Architecture

A two-screen lyric projection web app (Vue 3 + Vite) for churches/organizations. It opens two browser windows that communicate in real time:

- **Editor** (`/`) — manage songs, control the projector remotely, live preview
- **Projector** (`/projector/:id?`) — fullscreen lyric display, supports `?bare=1` for auto-fullscreen

### Data & Communication

- **Song storage:** All songs persisted in `localStorage` under key `lyric_songs_v1`. Sample data loaded from `src/assets/sample-songs.json` on first run.
- **Background storage:** Global background setting persisted separately in `lyric_bg_v1` as `{ mode: 'dark'|'gradient'|'image', url: '...' }`. Background is **global** — does not change when switching songs or slides.
- **Cross-window sync:** `BroadcastChannel` (channel name `lyric-projector`) carries messages between editor and projector. Editor sends `update_song`, `delete_song`, `select_song`, `bg_updated`, `control` (next/prev/goto). Projector sends back `position` updates. `bg_updated` message format: `{ type, mode, url }` (not per-song id).

### Slide Processing

Lyrics split on `---` (three dashes on their own line) into slides. Each slide's lines are trimmed, empty lines removed, and joined with `<br/>`. Optional uppercase transform applied at render time.

### Auto Font Sizing (Projector)

The projector calculates font size per-slide using `slideFont(slideHtml)` based on:
- Longest line character count → width constraint
- Number of lines → height constraint
- Available area: `vw * 0.84` wide, `vh * 0.88` tall
- Result: `clamp(24px, auto, 180px) + fontAdjust`

User can offset with `+`/`-` keys (`fontAdjust`). Press `0` to reset. `fontAdjust` resets to 0 on song change.

### Slide Transitions

All slides are always in the DOM with `position: absolute; opacity: 0`. The active slide gets `opacity: 1`. CSS `transition: opacity 0.6s ease` creates smooth cross-fades. This requires `display: none` to NOT be used on `.slide`.

### Key Files

| File | Role |
|---|---|
| `src/views/Editor.vue` | Full editor UI: song library, lyric editor, live mini-preview, bg presets, remote control |
| `src/views/Projector.vue` | Fullscreen presentation: auto-sized slides, cross-fade transitions, BroadcastChannel receiver |
| `src/App.vue` | Minimal wrapper — just `<router-view />` |
| `src/styles.css` | Global reset only — all component styles are scoped |
| `src/main.js` | Vue app init + vue-router setup |

`src/components/ControlsBar.vue` and `src/components/LyricSlide.vue` exist but are not used.

### Projector Keyboard Shortcuts

| Key | Action |
|---|---|
| `←`/`→` or `↑`/`↓` | Navigate slides |
| `Space` | Toggle auto-advance (4s interval) |
| `F` | Toggle fullscreen |
| `B` | Toggle blackout |
| `+`/`=` | Increase font size (4px offset) |
| `-` | Decrease font size (4px offset) |
| `0` | Reset font size adjustment |
