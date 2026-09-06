# Gym Paradise

An aspirational private gym builder for iPhone Safari and laptop browsers, using TypeScript, React, Babylon.js and the Sites/Vinext runtime.

## Room customisation update

- Dimensions: width 6–40 m, length 6–50 m, height 3.5–10 m. Resizing never removes machines; invalid shrinks are rejected. Placement, walking and the camera use the current dimensions.
- Four adjustable visual presets: After hours, Bright club, Orange iron and Electric blue.
- Industrial, tiled or open ceilings; suspended LED frames, strips or white panels; accent colour and brightness; optional daylight window panels.
- Individual wall colours, paint/concrete/brick surfaces, rubber/concrete flooring, floor colour and seams, a mirror on any one wall.
- Uploadable mural moved to any wall with width, height and vertical-position controls; a custom wall sign with text, colour and wall choice.
- Movable, resizable coloured turf; default and per-piece frame/upholstery colours. Boxing ring, heavy bag stand, plyometric boxes and accessory storage added.
- Customisation is validated in browser and Worker, saved with the gym, included in undo/redo and retained in portable layout exports. Existing private media remains account-bound.
- The Sketchfab creator supplied by the user is documented under Research. Two relevant candidates are not downloadable and return no licence in the public API; no files from that collection are bundled.

The current room remains rectangular, with one mural, one mirror wall and one turf lane. Window panels provide a visual daylight treatment, not openings to a navigable outside world. These controls do not yet include arbitrary floor plans, multiple storeys or custom imported 3D assets.

## Current experience

- 36 original approximate equipment types, covering strength, cables, free weights, cardio and functional training. Searchable catalogue, up to 40 placements; drag/nudge, rotate, duplicate, remove, undo and redo.
- Warehouse, original comic mural, mirror wall, physically based metal/upholstery materials, studio reflections, shadow maps, lighting themes, floor and frame finishes, and private custom wall art.
- First-person keyboard/touch walking with collision checks. Tap nearby equipment to open its training log.
- A private photo collection with exact real-world brand/model notes and source links. Wishlist records stay linked to similar 3D representations.
- On-demand Tesseract OCR and optional CLIP machine-category suggestions in a browser worker. Model downloads happen only when requested. User confirmation is required; no exact SKU or licensed-mesh search is fabricated. No paid AI API key is needed.
- Workout records, date, kg/lb, reps, exercise/settings, last set, maximum logged load, daily load chart and JSON export. Comparisons stay within machine, exercise and unit.
- D1 saves for layout, collection and training; R2 private photo bytes with ownership metadata. The trusted Sites user header scopes every request. Optimistic revisions reject concurrent overwrites. Browser storage holds recoverable drafts and supports migration from the previous local layout.
- Photos, clean first-person tour mode, and capability-detected video downloads (up to 60 seconds; MP4/WebM depending on browser). Manual screen recording remains the fallback.
- Shareable layout files strip private photo and collection references. Separate private account backups preserve records and account-bound image references.
- In-app Research tab and [equipment benchmark](docs/equipment-research.md) cover 23 gym chains/destinations, with primary sources and explicit inventory limitations.

## Current boundaries

These are improved original visual approximations, not verified manufacturer replicas or accurate purchasing footprints. Automatic exact-machine identification and licensed exact-model retrieval need a verified brand/model catalogue and an asset pipeline. Account-authenticated Sketchfab candidates are documented, but no third-party machine model is bundled. Public visitor links, social profiles and published tour feeds are not enabled. The hosted site remains private.

Cloud saves load when the app opens. An open second device detects conflicting writes instead of silently overwriting them; refresh to read its newest cloud save. Keep a private backup before replacing a conflicting draft. Videos are exported, not retained in a cloud gallery. A private backup references images in the same account; it does not embed their bytes.

Real iPhone validation is still required for graphics speed, memory pressure, camera formats, OCR / CLIP downloads, and Safari MediaRecorder. Static checks and local API tests do not establish device compatibility. The CLIP worker and its approximately 22.5 MB WASM runtime are lazy loaded; model weights require a substantial separate first download. Weak devices may need manual type selection. Research confirms published examples, not every branch's complete inventory or commercial success.

## Development

Requires Node.js 22.13+. `npm ci`, then `npm run dev -- --host 0.0.0.0` starts the frontend. Account-dependent requests require the Sites edge identity. Do not add a production fallback identity. For local API tests, requests explicitly supply test identities to simulate the trusted edge.

Production-like local API check:

1. `npm run build`
2. `npx wrangler d1 execute DB --local --config dist/server/wrangler.json --file drizzle/0000_goofy_the_stranger.sql`
3. `npm run start -- --port 3000`
4. `node --experimental-strip-types tests/api-smoke.mjs`

Default Wrangler state for that config is under `dist/server/.wrangler`; a rebuild clears it. Use a consistent explicit `--persist-to` path for longer local testing. Never apply the fixture script to the hosted site; the script rejects non-loopback origins.

Schemas live in `db/schema.ts`; generated schema-only migrations under `drizzle` are packaged by Sites. Applied migrations must not be rewritten. Server queries use prepared statements through `lib/server-store.ts`; tables are never created at request time.

## Validation

- `npx tsc --noEmit --incremental false`
- `node --experimental-strip-types --test tests/*.test.mjs` — 23 checks for placement, room resizing, customisation, mesh lifecycle, mirror planes, import validation, identity retention, safe sharing and comparable workout records.
- `npm run lint -- app lib hooks/use-gym-storage.ts components/gym-features.tsx components/gym-customizer.tsx workers db drizzle.config.ts tests` — authored code. The untouched starter component library has separate baseline lint findings.
- `npm run build`
- `node --experimental-strip-types tests/api-smoke.mjs` against the local production Worker — private persistence, concurrent-write rejection, image round-trip, ownership isolation, workout records, and invalid requests.

No browser automation or physical iPhone testing was performed for this update. Asset provenance is in [docs/assets.md](docs/assets.md).
