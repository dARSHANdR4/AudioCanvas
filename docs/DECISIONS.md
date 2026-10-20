# AudioCanvas — Engineering Decisions

Record material implementation choices and unresolved specification gaps here. The controlling precedence is **SRS → ARCHITECTURE → UX → PRD**.

## M0 decisions

| ID | Decision | Rationale / impact | Status |
| --- | --- | --- | --- |
| DEC-001 | Use a single npm-workspaces monorepo with `apps/web` and `packages/shared`. | Matches the project structure in `ARCHITECTURE.md` without introducing a multi-service deployment in M0. | Accepted |
| DEC-002 | Use the requested stack baseline: Next.js App Router, strict TypeScript, Tailwind CSS, Zod, Vitest, Playwright, axe-core, ESLint and Prettier. | Tooling enables the mandated route, type, lint, test and accessibility checks. Dependencies not required before their implementation milestone are deferred to avoid unused packages. | Accepted |
| DEC-003 | Preset short IDs accept 1–10 ASCII letters, digits, hyphens or underscores. | The backend allows up to 10 characters; the route validates external path data before displaying or using it. | Accepted |
| DEC-004 | Landing/Studio artwork is static decorative SVG/CSS until M1/M2. | M0 is the shell milestone; labeling the artwork as a preview avoids implying functional audio analysis or rendering. | Accepted |
| DEC-005 | Mapping intensity values will be stored as a normalized multiplier from 0 to 2 and displayed as 0% to 200%. | Resolves the UI percentage versus preset example values such as `1.2`; the mapping engine will implement this in M3. | Accepted for implementation; schema finalization in M3 |
| DEC-006 | MP4 with H.264/AAC remains the primary export target; incompatible configurations must be feature-detected and explicitly messaged. | Avoids silently changing the specified output format. Any alternate format must be labeled and reviewed in M5. | Accepted for M5 |
| DEC-007 | Auth.js is the intended authentication integration. The database adapter and the backend's custom `sessions` / `oauth_accounts` DDL must be reconciled in M6 before choosing a final session-storage schema. | Avoids unintentionally running two authentication/session implementations. No auth dependency or credentials are needed in M0. | Deferred to M6 |
| DEC-008 | M7 comprises hardening and the launch checklist. | The detailed roadmap table calls M7 “Launch,” while the master prompt calls M7 “Hardening”; both hardening and go/no-go work will be included in M7. | Accepted |
| DEC-009 | Use framework-supported Tailwind CSS v4 setup and CSS custom properties aligned with UX token values. | The official Next.js/Tailwind guide uses `@tailwindcss/postcss` and `@import "tailwindcss"`; the named UX colors are kept as source tokens. | Accepted |
| DEC-010 | Defer Zustand, Three.js, `fft.js`, `mp4-muxer`, database drivers/ORM, Auth.js, and S3/Redis clients until their owning milestones. | Installing unused runtime dependencies in M0 conflicts with the no-unused-dependencies rule; the stack selection itself remains unchanged. | Accepted |
| DEC-011 | CI uses `npm install` while this starter is delivered without a generated lockfile. | Package-registry DNS is unavailable in the current build environment, so a complete lockfile cannot be generated here. CI will generate the lock as part of dependency resolution; commit `package-lock.json` after the first successful install in a network-enabled environment. | Temporary; lockfile required before production |
| DEC-012 | M0 validation uses named smoke tests rather than `TC-00*` IDs. | The provided test roadmap starts its numbered test cases at TC-01 for M1; the M0 shell still receives route, safe-URL, first-run notice and automated accessibility smoke coverage. | Accepted |
| DEC-013 | Exclude `apps/web/vitest.config.ts` from the Next.js app TypeScript include set. | Vitest configuration is build tooling, not an application module; excluding it prevents production type checks from depending on test-runner packages that may not be installed for the app root. Unit tests still load the config through Vitest. | Accepted |

## M1 decisions

| DEC-014 | Audio input validation uses a shared Zod metadata schema plus an explicit extension/MIME allowlist. | The browser decoder is invoked only for supported audio formats up to 100 MB; malformed, empty, mismatched, or oversized selections receive actionable messages. | Accepted |
| DEC-015 | The live audio analyser uses a reusable `AudioFrame` and typed-array scratch buffers; band extraction, smoothing, auto-gain and onset logic stay in a pure module. | Live and future offline analysis can invoke the same spectrum-analysis function; no per-frame sample values enter React state. Offline FFT buffer processing is wired during M5 when the encoder/export pipeline is added. | Accepted |
| DEC-016 | File playback connects the source separately to the analyser and audio destination; microphone sources connect only to the analyser. | This provides audible file playback without routing microphone input to speakers or creating a feedback path. | Accepted |
| DEC-017 | Browser-native `decodeAudioData` is used for MP3/WAV/FLAC/OGG/M4A decode. | It avoids a second decoder and keeps file bytes local; support depends on the browser codec implementation, and decode failures are presented clearly. | Accepted |
| DEC-018 | M1 includes a short deterministic demo groove generated into an in-memory AudioBuffer after a user gesture. | Lets a first-time visitor try playback and analysis without a downloaded sample asset or upload; generated samples remain on-device and use no unseeded random values. | Accepted |

## Deferred items

- Worker-based WebCodecs/OffscreenCanvas support and codec fallback behavior will be designed and tested in M5.
- AudioContext gesture gating and no-microphone-loopback behavior will be implemented and tested in M1.
- GPU lifecycle disposal, seeded scene determinism and adaptive quality will be implemented and verified in M2.
- Database adapter, migrations, CSRF, rate limits, telemetry event allowlists and account deletion will be implemented in M6.
- Final reviewed legal copy must replace the legal placeholders before public launch.
- The first-visit photosensitivity notice is present in M0 and can be dismissed per browser profile; the reactive renderer and its flash-limiter enforcement remain later-milestone work.
