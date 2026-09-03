# Calagopus Brander

A browser-based, **SVG-first** logo and branding builder for
[Calagopus](https://calagopus.com). Mix and match the fox mascot, the
`Calagopus` wordmark, a tagline and an optional prefix line — the same
"mix‑and‑match" system used to produce the banners in the
[calagopus-branding](https://github.com/calagopus) repo — then export the
result as **SVG, PNG or WebP** at whatever pixel size you need.

Vanilla JS on the client, bundled with **Vite**, deployed to **Cloudflare
Workers** (Static Assets + a small Worker for a couple of dynamic routes).

## Quick start

```bash
npm install
npm run dev          # Vite dev server -> http://localhost:5173/
```

| Script | Does |
|--------|------|
| `npm run dev` | Vite dev server with HMR (client only) |
| `npm run build` | Bundle to `dist/` |
| `npm run preview` | Serve the built `dist/` with Vite |
| `npm run worker:dev` | `build` + `wrangler dev` — runs the real Worker in workerd on `http://localhost:8787/` |
| `npm run check` | `build` + `wrangler deploy --dry-run` (validates the deploy bundle) |
| `npm run deploy` | `build` + `wrangler deploy` to Cloudflare |

The app is served over http and fetches the mascot poses from `/mascots/`
at runtime.

## Deploying to Cloudflare Workers

```bash
npx wrangler login            # once, or set CLOUDFLARE_API_TOKEN
npm run deploy
```

`wrangler.jsonc` declares the Worker (`src/worker.js`) and binds the built
`dist/` folder as Static Assets (`ASSETS`). Request flow on the edge:

- a path that maps to a built file (`/`, `/assets/*`, `/mascots/*`) → served
  directly from the asset store;
- anything else → `src/worker.js` runs. It answers `GET /healthz` and
  `GET /api/mascots` (the catalogue, proxied from the static manifest) and
  otherwise falls back to `index.html`.

No KV / D1 / R2 / Durable Objects — a rename in `wrangler.jsonc` (`name`) is
all that's needed to point it at your own account.

Web fonts are pulled from Google Fonts for the preview and **embedded**
(base64) into every export so the files are self-contained. Offline, the
builder falls back to the system sans stack and tells you so.

## What you can control

**Fonts, colours and type sizes are fixed by the brand system — they are not
user-editable.** Typography (Nunito, brand weights, brand letter-spacing) and
the brand palette are constant; every type size and the mascot size come from
the chosen **preset**.

| Group        | Options |
|--------------|---------|
| **Presets**  | Icon only, Wordmark only, Full logo, Simple full logo, vertical variants, Standing / Stretching — each fixes the layout, spacing, colours and all sizes |
| **Composition** | Horizontal / vertical layout, alignment |
| **Mascot**   | show/hide, 6 poses (icon, standing, facing, stretching, sleepy, sleepy‑zzz) |
| **Wordmark / Tagline / Prefix** | show/hide and the text string only |
| **Background** | transparent, or a solid brand-white plate |
| **Preview**  | fit-to-view, scroll / drag the zoom slider to zoom, optional transparency checker |
| **Export**   | SVG / PNG / WebP, width, height, lock aspect ratio, WebP quality, "bake background into raster", file name |

To change the brand system itself, edit `CB.TYPE` / `CB.THEMES` / `CB.PRESETS`
in `src/presets.js`.

State is saved to `localStorage`, so your last composition is restored on
reload. **Reset** clears it.

## Brand palette

| Use            | Hex       |
|----------------|-----------|
| Fox White      | `#ffffff` |
| Fox Accent     | `#b4b4b4` |
| Text Primary   | `#74c0fc` |
| Background     | `#222222` |
| Background Accent | `#2e2e2e` |

## Project layout

```
index.html                 Vite entry — markup + all form controls
vite.config.js             build config
wrangler.jsonc             Cloudflare Worker + Static Assets config
public/mascots/            fox pose .svg files + manifest.json  <-- edit these
src/
  main.js                  UI wiring, live preview, export (app entry)
  core.js                  shared `CB` namespace object
  builder.js               SVG composition engine (pure, no DOM)
  mascots.js               runtime loader for /mascots/
  presets.js               brand system: fixed type, palette, presets
  fonts.js                 Google Fonts loading + base64 embedding
  styles/app.css           dark UI styling
  worker.js                Cloudflare Worker entry
```

`public/` is copied verbatim into `dist/` at build time, so the mascot
files live at `/mascots/...` in dev, in the build, and on the edge.

### Mascot poses

Poses live as ordinary SVG files in `public/mascots/`, catalogued by
`public/mascots/manifest.json`:

```json
{ "id": "icon", "label": "Icon", "description": "Sitting fox, head turned", "file": "icon.svg" }
```

To add or swap a pose, drop an `.svg` in that folder and add an entry to the
manifest — nothing else to rebuild. On load, each file's palette fills
(`#b4b4b4`, and `#fff` / `white`) are swapped for `__ACCENT__` / `__WHITE__`
tokens that the builder substitutes with the chosen colours, so any
two-tone line-art fox drops straight in.

## Notes / limitations

- Text is exported as real `<text>` elements with an embedded web font, not
  outlined paths. Any SVG renderer with the embedded font (all browsers)
  reproduces it exactly; a few design tools that ignore embedded fonts in
  SVG will substitute a fallback.
- Raster export renders through an offscreen `<canvas>`; very large sizes
  (> ~10000 px) are limited by the browser's canvas ceiling.
