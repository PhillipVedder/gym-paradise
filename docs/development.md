# Development

## Prerequisites

- Node.js 22.13 or later in the 22.x line (`nvm use` reads `.nvmrc`).
- npm and Git. Use `npm ci` to install the locked dependency tree.
- A WebGL-capable browser for the 3D view.

The validated development environment is macOS; CI also checks Linux. Other operating systems are not yet verified.

## Local demo

```bash
npm ci
npm run demo
```

Open `http://127.0.0.1:3000`. The runner builds the app, applies tracked D1 migrations locally, starts a loopback Worker on an available port, and starts the demo proxy on port 3000. It does not create cloud resources or require credentials.

Use **Example gym → Load example gym** for the full collection. Saves and uploaded demo images remain in `.wrangler/demo` across rebuilds and restarts. Browser drafts remain in local storage under the local account. This is one local review account; there is no account switcher or cloud synchronisation in demo mode.

Ctrl+C stops the proxy and Worker. If port 3000 is occupied, stop the process already using it before restarting; the runner deliberately does not terminate unrelated processes.

To reset the local demo, stop it, remove only `.wrangler/demo`, and clear this origin's browser site data. That removes local demo saves and images, so export anything you want to keep first.

The UI uses the same storage wording as the hosted app; in this demo all D1/R2 operations are emulated locally. Recognition features may still download their public model/runtime dependencies on demand.

## Commands

| Command            | Purpose                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `npm run demo`     | Build and start the complete local app with a demo identity                    |
| `npm run dev`      | Vite/Vinext development server for frontend iteration; does not inject a login |
| `npm run build`    | Build browser bundles and the production Worker                                |
| `npm run start`    | Low-level Wrangler preview of an existing build; no demo identity              |
| `npm run check`    | Format check, strict TypeScript, lint, unit and geometry tests                 |
| `npm run test:api` | Start a fresh local Worker/database, test API behaviour, then clean up         |
| `npm run format`   | Apply the shared Oxfmt formatting rules                                        |

`npm run dev` and `npm run start` are low-level tools. Account APIs intentionally return 401 without the trusted gateway identity; use `npm run demo` to evaluate the whole app. The demo runs a production build without hot reload. After source changes, stop and restart it.

## Storage and migrations

Schema declarations live in `db/schema.ts`; SQL migrations live in `drizzle/`. Wrangler records applied migrations. Add a new migration for a schema change; do not rewrite a migration already applied to the hosted database.

The demo uses a stable `.wrangler/demo` persistence path. API tests create their own temporary directory and disposable identities, and never touch that demo directory. The fixture script refuses non-loopback origins.

## Hosting

`.openai/hosting.json` records the existing private Sites project and its DB/ASSETS bindings. It is deployment metadata, not a credential. A clone can build and run locally without owning that hosted project. CI verifies the build but does not deploy it.

Do not deploy the raw Worker publicly without adapting its trusted-header authentication. See the [architecture trust boundary](architecture.md#storage-and-trust-boundary). Creating a deployment for another account requires that account's own project configuration and authentication setup.

## Troubleshooting

- **Unsupported Node version:** run `node --version`, switch to the 22.x line, then rerun `npm ci`.
- **Sign-in message on localhost:** use the demo URL printed by `npm run demo`, not the internal Worker or raw dev-server URL.
- **Blank 3D canvas:** inspect browser console messages and confirm WebGL/hardware acceleration is available. Optional OCR is not required for the editor.
- **Recognition download is slow:** keep using manual type/brand/model entry. Model downloads are intentionally optional.
- **Save conflict:** export a private backup before replacing a recovery draft. The 409 response protects newer state from silent overwrites.
- **Restricted installation environment:** package installation and model downloads need network access. The local app itself needs no API key.
