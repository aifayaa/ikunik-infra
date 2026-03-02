# Decisions (ADR log)

## 2026-03-02 - Use ikunik-infra as migration control-plane repository
- Context: dedicated control repo was required; ikunik-infra already exists under target GitHub owner.
- Decision: keep migration control artifacts under `documentation_claude/migration_control/` in ikunik-infra.
- Consequence: all sessions can pull one repository for status + evidence continuity.

## 2026-03-02 - Keep temporary seed remotes for deterministic local builds
- Context: build scripts reset to `origin/<branch>`; GitHub app/build-tools repos are not created yet.
- Decision: keep `origin` mapped to local seed clone with push disabled; add `github` remote for future cutover.
- Consequence: builds remain executable without risking writes to legacy repos.

## 2026-03-02 - Validation app build executed on prod/us with target API/SSR override
- Context: appId `05e8d798-57b8-413d-b1cc-d81866c01cf0` does not exist in `prod/fr`; it resolves to `prod/us`.
- Decision: run build on `prod/us` metadata while forcing target API/SSR endpoints in `ikunik-app/.env.prod.us`.
- Consequence: build validation reaches green for this appId on target backend profile without mutating legacy repositories.
