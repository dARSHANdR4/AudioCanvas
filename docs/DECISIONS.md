# AudioCanvas — Architecture Decisions

## M0-001: Single repository with workspace monorepo
**Decision:** Keep `apps/web` as the Next.js App Router application and `packages/shared` for common types and schemas.
**Reason:** This follows `ARCHITECTURE.md` and keeps browser UI, engine, and shared validation boundaries explicit.

## M0-002: Mapping intensity representation
**Decision:** Store mapping intensity as a normalized multiplier from `0` to `2`; display it as `0%` to `200%`.
**Reason:** This reconciles the UX range with the sample preset values.

## M0-003: Export capability degradation
**Decision:** MP4 is the primary export format. Unsupported encoders/canvas features must show an explicit compatibility message; any alternate format must be visibly labeled as a fallback.
**Reason:** Preserve the SRS requirements without silently changing output behavior.

## M0-004: Authentication provider
**Decision:** Use Auth.js and reconcile its adapter schema with the backend tables before M6; do not introduce competing session implementations.
**Reason:** The required stack specifies Auth.js.

## M0-005: Development dependency audit
**Decision:** Keep production dependencies clean and document remaining development-only audit findings. Do not run `npm audit fix --force` without reviewing the major-version changes it proposes.
**Reason:** Preserve the verified M0 toolchain while tracking the remaining transitive risks.

## M0-006: Git repository isolation
**Decision:** AudioCanvas is maintained as its own Git repository; do not reuse the parent folder's repository or the `International-Education-Cost-Predictor` remote.
**Reason:** Avoid including unrelated personal and project files in commits.
