# Contributing

Gym Paradise is a personal portfolio project with original code rights reserved. Feedback and bug reports are welcome; publication of the source is not a blanket reuse licence. For substantial code contributions, discuss the scope and contribution terms with the maintainer before starting.

## Report a problem

Use the bug-report form. Include your browser/device, reproduction steps, expected and actual results, and a screenshot if useful. Use a portable layout export rather than a private account backup, and omit personal workout data and private photos.

Security-sensitive reports belong in the private reporting channel described in [SECURITY.md](SECURITY.md).

## Development workflow

1. Follow [local setup](docs/development.md).
2. Keep each change focused on one problem. Explain the user-visible behaviour and relevant trade-offs.
3. Add a meaningful regression test when changing validation, persistence or interaction logic.
4. Run `npm run check`, `npm run build`, and `npm run test:api`.
5. Document any browser or device checks separately from automated results.

## Conventions

- TypeScript strict mode; format with `npm run format`.
- Keep testable layout/record rules in `lib/`; keep rendering and UI orchestration separate where practical.
- Validate imported and saved data at the server boundary.
- Add migrations; never rewrite previously applied SQL.
- Do not commit secrets, local storage, generated build output or private images.
- Record sources and licences for third-party assets in `docs/assets.md`.
- AI assistance is welcome; verify generated work and describe meaningful limitations or unverified claims.

Commit messages should explain the actual change, for example `Fix mural sizing when resizing the room`. Commit history should reflect real work.
