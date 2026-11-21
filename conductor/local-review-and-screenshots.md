# Local Network Review & Multi-Viewport Screenshot Guide

How to open live Starmap views over the local network from any device, and how `npm run capture:views` captures multi-viewport Playwright screenshots for review.

---

## 1. Local Network URLs

The Vite application server and Storybook bind to `0.0.0.0` with `strictPort: true` and `allowedHosts: true`, so their ports never drift to fallbacks. `<LAN_HOST>` is the developer machine's LAN IPv4 address or hostname (`capture:views` auto-detects the first non-internal IPv4 address; override with `--lan-host=<host>`).

| Service | Command | URL |
| :--- | :--- | :--- |
| **Starmap App (Dev)** | `npm run dev` | `http://<LAN_HOST>:5173` |
| **Starmap App (Preview)** | `npm run preview` | `http://<LAN_HOST>:4173` |
| **Storybook Component Explorer** | `npm run storybook` | `http://<LAN_HOST>:6006` |

### Primary Application Entry Routes

- Application Root: `http://<LAN_HOST>:5173/`
- Galaxy: `http://<LAN_HOST>:5173/galaxy`
- System: `http://<LAN_HOST>:5173/system/sol`
- Planet: `http://<LAN_HOST>:5173/planet/earth`
- Search: `http://<LAN_HOST>:5173/search`
- Guide: `http://<LAN_HOST>:5173/guide/star-types`

---

## 2. Multi-Viewport Screenshot Pipeline (`npm run capture:views`)

`scripts/capture-views.ts` drives Playwright Chromium across **5 standard viewports**:

1. **Mobile Portrait:** `390×844` (`@2x`)
2. **Tablet Portrait:** `768×1024` (`@2x`)
3. **Tablet Landscape:** `1024×768` (`@2x`)
4. **Desktop Standard:** `1440×900` (`@1x`)
5. **Desktop Ultrawide / QHD:** `2560×1440` (`@1x`)

### Flags

| Flag | Purpose | Default |
| :--- | :--- | :--- |
| `--routes=<a>,<b>` (or `--route=`) | Routes or query states to capture | Built-in default route set |
| `--out-dir=<path>` | Output directory for PNGs and `gallery.md` | `/tmp/starmap-screenshots` |
| `--port=<n>` | App or Storybook port | `5173` |
| `--lan-host=<host>` | Host used in generated clickable links | Auto-detected LAN IPv4, else `127.0.0.1` |
| `--base-url=<url>` | Capture an already-running server | `http://127.0.0.1:<port>` |
| `--wait-ms=<n>` | Settle time after navigation | `1200` |

### Usage

```bash
# Capture the default routes across all 5 viewports into /tmp/starmap-screenshots:
npm run capture:views

# Capture specific routes:
npm run capture:views -- --routes=/,/galaxy

# Override the host used in links:
npm run capture:views -- --lan-host=<LAN_HOST> --routes=/guide/star-types

# Capture Storybook iframe stories on port 6006:
npm run capture:views -- --port=6006 --routes="/iframe.html?id=canvas-fullassembly--galaxy-scale"
```

The script reuses a running dev server or spawns (and later stops) Vite itself, so never start a foreground `npm run dev` just to capture. It waits for WebGL/network readiness and writes the PNGs plus a `gallery.md` containing clickable LAN links and `carousel` blocks.

### Presenting Results

Write ephemeral output to `/tmp/starmap-screenshots` (never inside the workspace). Copy only the images needed for the active review into the conversation artifact directory (`<appDataDir>/brain/<conversation-id>/`) and embed them in the review artifact next to the `<LAN_HOST>` links.
