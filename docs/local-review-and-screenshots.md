# Local Network Review & Multi-Viewport Screenshot Guide

This guide documents how to access live Starmap views over the local network from any device (desktop, tablet, mobile) and how the agent captures and embeds multi-viewport Playwright screenshots directly in the review UI.

---

## 1. Consistent Local Network URLs

Both the Vite application server and Storybook are locked to `0.0.0.0` with `strictPort: true` and `allowedHosts: true` so their URLs never drift to fallback ports:

| Service | Command | Local Network URL (IP) | Local Network URL (Hostname) |
| :--- | :--- | :--- | :--- |
| **Starmap App (Dev)** | `npm run dev` | [`http://192.168.1.124:5173`](http://192.168.1.124:5173) | `http://codebox:5173` |
| **Starmap App (Preview)** | `npm run preview` | [`http://192.168.1.124:4173`](http://192.168.1.124:4173) | `http://codebox:4173` |
| **Storybook Component Explorer** | `npm run storybook` | [`http://192.168.1.124:6006`](http://192.168.1.124:6006) | `http://codebox:6006` |

### Application Entry & Quarantined POC Reference Routes
- **Clean-Slate Application Root (`/`):** [`http://192.168.1.124:5173/`](http://192.168.1.124:5173/) *(Active journey views and paths are added screen-by-screen during Stage 1)*
- **Quarantined POC Reference Routes (`/poc/*`):**
  - [`http://192.168.1.124:5173/poc/galaxy`](http://192.168.1.124:5173/poc/galaxy)
  - [`http://192.168.1.124:5173/poc/system/sol`](http://192.168.1.124:5173/poc/system/sol)
  - [`http://192.168.1.124:5173/poc/planet/earth`](http://192.168.1.124:5173/poc/planet/earth)
  - [`http://192.168.1.124:5173/poc/reference`](http://192.168.1.124:5173/poc/reference)

---

## 2. Automated Multi-Viewport Screenshot Pipeline (`npm run capture:views`)

At every visual checkpoint or option comparison, the agent runs `npm run capture:views` (`scripts/capture-views.ts`) to capture live Playwright Chromium renders across all **5 standard viewports**:

1. **Mobile Portrait:** `390×844` (`@2x` — iPhone 14/15/16 Pro)
2. **Tablet Portrait:** `768×1024` (`@2x` — iPad Portrait)
3. **Tablet Landscape:** `1024×768` (`@2x` — iPad Landscape)
4. **Desktop Standard:** `1440×900` (`@1x`)
5. **Desktop Ultrawide / QHD:** `2560×1440` (`@1x`)

### Usage

```bash
# Capture default route (/) across all 5 viewports into an artifact directory:
npm run capture:views -- --out-dir=/path/to/artifact/dir/screenshots

# Capture specific journey routes or query states:
npm run capture:views -- --routes=/,/poc/galaxy --out-dir=/path/to/artifact/dir/screenshots

# Capture Storybook iframe stories on port 6006:
npm run capture:views -- --port=6006 --routes="/iframe.html?id=canvas-fullassembly--galaxy-scale" --out-dir=/path/to/artifact/dir/screenshots
```

### How Screenshots Are Presented in This UI
- The script automatically starts the dev server if it is not already running, waits for WebGL/network readiness, captures each viewport, and generates a `gallery.md` with clickable LAN links and ````carousel blocks.
- Because the screenshots are written directly into the conversation's artifact directory (`<appDataDir>/brain/<conversation-id>/`), they render inline inside the Antigravity UI artifact panel so you can swipe through Mobile, Tablet, Desktop, and Ultrawide renders alongside the clickable LAN URLs.
