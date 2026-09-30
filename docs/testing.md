# Testing and validation

## Automated checks

GitHub Actions runs this sequence on pushes to `main` and pull requests:

```bash
npm ci
npm run check
npm run build
npm run test:api
```

The workflow uses read-only repository permissions and pinned action revisions. It has no hosted database credentials and does not deploy the app. Dependency-update pull requests are grouped and scheduled monthly.

| Layer                         | Coverage                                                                                                              | Important limit                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| TypeScript / Oxlint / Oxfmt   | Strict types, correctness rules, shared formatting across maintained source                                           | Static checks do not prove interaction quality       |
| Pure logic tests              | Camera maths, placement, room resizing, record validation, safe exports, example layout                               | They do not render pixels                            |
| Babylon NullEngine            | Finite geometry, mesh disposal, mirror planes, room changes                                                           | No physical GPU or Safari renderer                   |
| Demo proxy tests              | Fixed identity, credential stripping, same-origin requests, hostile Host/Origin rejection                             | Local tooling is not internet authentication         |
| Production Worker integration | Revision conflicts, owner isolation, image storage/access, record round trips, rejected input and cross-origin writes | Local emulation, not hosted gateway end-to-end tests |

API integration tests create a fresh local database and R2 store, run against the built Worker, then stop the Worker and delete their temporary state. No test fixture is sent to the hosted site.

## Browser checks

Desktop Chromium and phone-sized Chromium touch emulation have been used to inspect:

- Loading the complete showcase and switching between Build and Explore.
- Preview placement, collision feedback, cancelling, bin deletion and Undo.
- Orbit/pan, zoom, two-finger gestures, and room/art resizing.
- Customisation dialogs, layout persistence and the mobile catalogue.

Screenshots in the README are real application captures. These browser checks are manual/session validation; they are not currently a committed automated browser suite. CI's green check does not imply these checks ran on every commit.

## Physical iPhone verification still required

Test on actual Safari before claiming full iPhone support. Record the device, iOS version, room contents and reproduction steps. Check sustained frame rate, heat/memory pressure, camera image formats, multi-touch, optional model downloads, and screenshot/video exports.

No formal FPS benchmark, complete accessibility audit, penetration test, or production load test is claimed. Their absence is tracked in the roadmap rather than hidden behind a passing build.
