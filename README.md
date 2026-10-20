# AudioCanvas

A browser-based, no-code, sound-reactive visualizer studio inspired by Winamp and MilkDrop.
Audio is designed to remain on-device; user audio is never uploaded to the backend.

## Milestone status

**M0 — Repository setup and application shell.** This milestone establishes the monorepo, Next.js App Router, TypeScript strict mode, Tailwind CSS design tokens, lint/format/typecheck/unit-test tooling, Playwright smoke tests, CI, source documentation, and the first set of responsive routes. Audio analysis, Three.js rendering, scene switching, presets, authentication, and export are intentionally not implemented in M0.

## Requirements covered by M0

- PRD: route and studio-shell foundation for US-03/US-04/US-09/US-10/US-11/US-12; no functional completion claimed for those stories yet.
- SRS: Zod validation for route parameters and tooling/accessibility foundations for NFR-07 and NFR-11; full NFR compliance is not claimed in M0.
- UX: routes `/`, `/studio`, `/gallery`, `/me`, `/p/{shortId}`, and `/legal/{slug}`; dark neon design tokens, accessible labels, responsive shell.
- Architecture: the `apps/web` plus `packages/shared` monorepo layout and the documentation's engine boundaries.
- Test roadmap: M0 smoke checks. TC-01 through TC-05 remain M1 exit criteria.

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm 10 or newer

## Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
npm run format:check
```

Run `npm run format` before `npm run check:all` to apply the repository formatter. Playwright installs Chromium separately when needed:

```bash
npx playwright install chromium
```

## Routes in M0

- `/` — landing page and product introduction
- `/studio` — responsive studio frame with non-functional, clearly disabled engine controls
- `/gallery` — community gallery empty state
- `/me` — saved presets/account empty state
- `/p/{shortId}` — validated shared-preset route shell
- `/legal/terms`, `/legal/privacy`, `/legal/photosensitivity` — legal content placeholders to be reviewed before launch

The visualizer art in M0 is a decorative, CSS/SVG preview only; it is not an audio-reactive renderer. Audio and rendering arrive in later milestones. A first-visit photosensitivity notice is dismissible and stored locally. M0 smoke tests cover route shells, invalid share IDs and an axe accessibility scan.

## Environment setup

This delivery has no `package-lock.json` because package registry DNS failed in the build environment. Run `npm install` in a network-enabled environment and commit the generated lockfile before production. M0 does not require API keys, OAuth credentials, database access, or `.env` configuration. `.env.example` documents variables reserved for M6; fill them only when those integrations are implemented. Do not expose server secrets through `NEXT_PUBLIC_*` variables.

## Documentation

The six source-of-truth specifications are in [`docs/`](docs/). `ARCHITECTURE.md` and `TEST_ROADMAP.md` are derived from Parts 5 and 6 of the provided AudioCanvas documentation pack. `DECISIONS.md` records implementation choices made under the documented precedence rules.
