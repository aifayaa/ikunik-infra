# Ikunik Platform Workplan

Last updated: 2026-03-06

## Milestones and acceptance gates

### M0 - Isolation Ready
Acceptance:
- target-lane repos exist and are used for all changes.
- legacy remotes are push-disabled in target-lane workspaces.
- control-plane artifacts initialized.

### M1 - API Config Isolation
Acceptance:
- target parameters captured in `TARGETS/<target_id>.yaml`.
- API endpoint profile is target-specific.
- no undocumented hardcoded legacy infra values in active API deploy path.

### M2 - Build Chain Isolation
Acceptance:
- app/build-tools/dashboard source paths are reproducible from target-lane repos.
- CI/build guardrails enforce target account and reject legacy write paths.
- no writes occur in legacy AWS accounts.

### M3 - Security Isolation
Acceptance:
- secrets inventory completed.
- plaintext secrets replaced by secure injection path.
- secret rotation plan documented.

### M4 - App Build Green (Validation Goal)
Acceptance:
- build for appId `05e8d798-57b8-413d-b1cc-d81866c01cf0` completed successfully in target lane OR blocked with reproducible blocker and remediation steps.
- command log and output summary stored in `EVIDENCE_LOGS/`.

### M5 - Runtime Smoke Green
Acceptance:
- API smoke checks for key endpoints pass against target base URL.

### M6 - UAT Green
Acceptance:
- auth, content CRUD, file/media, async/stream flows validated.

### M7 - Production Readiness
Acceptance:
- legacy markers removed from production path.
- rollback runbook and cutover checklist complete.

### M10 - Full Platform Green (Ikunik)
Acceptance:
- dashboard and API are green for US lane on target infra.
- app build and runtime are green on target infra (auth + content + key flows).
- CI pipelines deploy only to target account/buckets and pass canary runs.
- temporary Mongo legacy bridge is stable with monitored fallback path.
- all build resets use GitHub target origin (no local-seed dependency).

### M8 - Dashboard Deployment Ready
Acceptance:
- dashboard repo is isolated for target lane.
- dashboard scope is locked to same active lane as API (`prod` + `us-east-1` for current target).
- temporary dashboard domain strategy is documented in target profile and runbook.

### M9 - Dashboard Runtime Green
Acceptance:
- dashboard deployed on temporary target URL.
- dashboard runtime points to target API profile.
- final DNS/custom-domain cutover checklist prepared with rollback.

## Current status snapshot (2026-03-14)
- Regression audit completed across app/dashboard/api/build-tools.
- Re-opened milestones: M1, M2, M3, M5, M10 (US-only drift still present in active config paths).
- Key blocker categories:
  - API/infra still contains FR/EU mappings and legacy constants in active serverless/env configs.
  - Build-tools active settings still contain FR/preprod profiles and legacy endpoints.
  - App active branch still carries FR/preprod env artifacts and legacy preview/CI defaults.
  - Dashboard runtime scope is mostly US-only but CI default API value and legacy coupling remain.
- Canonical evidence:
  - `EVIDENCE_LOGS/2026-03-14_us_only_audit_regression_and_remediation_plan.md`
- Current operating rule for builds:
  - use canonical lane workspaces only, with `HEAD == origin/<branch>` verification before builds.
  - do not rely on local unpushed edits for release builds.
  - for each iOS release build, run signing preflight first in the same shell context:
    - `source ~/.crowdaa/IOSBuildEnv.sh`
    - verify `MATCH_PASSWORD` is set
    - export explicit `TEAM_ID` / `ITC_TEAM_ID` / `APP_IDENTIFIER`
    - require green `fastlane match appstore --readonly ...` before `buildIosV2`.

## Ordered Execution Tracks (for repeatable client replication)

### Track A - API Setup (run first)
Required outcome:
- target account profile captured in `TARGETS/<target_id>.yaml`.
- microservice deployment path validated (`deployOrderList` + stack green checks).
- smoke checks pass on target API base URL.

Mandatory evidence:
- deploy logs per module wave.
- smoke output (`smoke_prod_clone.sh` and/or `uat_options_abc.sh` excerpt).
- legacy-marker scan output (`rg` against `serverless.js` files).

### Track B - Dashboard Setup (run second)
Required outcome:
- dashboard deployment path is isolated from legacy repo/remotes.
- dashboard is scoped to the same active target lane as API.
- dashboard publishes to temporary target URL before final DNS cutover.

Mandatory evidence:
- dashboard repo remote state (legacy push disabled, target remote active).
- dashboard endpoint mapping (legacy -> temporary target -> final target).
- dashboard smoke results against temporary target URL.

### Track C - Build Tooling Setup (run third)
Required outcome:
- app + build-tools workflows run from target-lane repos.
- build branch/reset behavior documented and deterministic.
- execution does not require pushing to legacy repos.

Mandatory evidence:
- `HEAD`/`origin/<branch>`/`ls-remote` hash parity logs.
- iOS signing preflight log (`match --readonly`) showing decrypt/install success in the same shell context as the iOS build.
- build command logs and artifact paths.
- app API contract check output (guest + logged header behavior).

### Track D - DB Setup (run fourth)
Required outcome:
- DB strategy selected (`temporary_bridge` or `full_migration`).
- collection/index inventory completed.
- cutover + rollback plan documented and validated on canary appId.

Mandatory evidence:
- collection/index count snapshot (source and target).
- migration command logs (dump/restore or controlled bridge deploy).
- post-migration API/UAT/dashboard checks against target profile.

## Execution closure (agent mode)

### Phase A - Workspace determinism hardening (completed)
Actions:
- enforce clean build source:
  - app builds run only from `/Users/crowdaa/Desktop/gits/ikunik-app-target-clean`.
  - treat `/Users/crowdaa/Desktop/gits/ikunik-app` as non-canonical until parity is restored.
- record branch parity guard output before every release build.

Validation:
- `HEAD == origin/staging/target-infra-build-ready` in canonical workspace.
- no release build log references dirty/divergent app workspace.

### Phase B - Security isolation closure (M3 completed)
Actions:
- complete secrets inventory from templates and current config scan results.
- remediate inline credential material in active runtime/deploy paths (move to secure injection).
- resolve `T-012`:
  - either valid Fastlane credentials for `vigilehoareau@gmail.com`,
  - or documented ADR waiver with owner/date and fallback process.

Validation:
- no active plaintext secret patterns in runtime/deploy config.
- `secrets_inventory.csv` and rotation plan are filled and linked from evidence.
- M3 tasks are closed or formally waived.

### Phase C - Production readiness closure (M7 completed)
Actions:
- finalize dashboard final-domain cutover gate and rollback drill evidence.
- close temporary exception `EX-001` or document explicit bounded extension.
- run full pre-release checklist (control-plane, isolation, smoke, UAT) with timestamped evidence.

Validation:
- rollback runbook tested and attached.
- no unresolved legacy markers in production path.
- M7 marked done with evidence references.
