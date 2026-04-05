# Next-Client Replication Framework

Last updated: 2026-03-11

## Objective
Provide a deterministic framework so a fresh Codex agent can replicate platform infrastructure for a new client in four ordered tracks:
1. API setup
2. dashboard setup
3. build tooling setup
4. DB setup

This file is execution-focused and must be used with:
- `MIGRATION_CHARTER.md`
- `DOC_CONSISTENCY_RULES.md`
- `WORKPLAN.md`
- `DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md`

## Start-of-Client Bootstrap
1. Copy `TARGETS/target-template-next-client.yaml` to `TARGETS/<target_id>.yaml`.
2. Fill all required fields (no placeholders left), including:
   - API execution scope lock (`stage`, `region`, `single_scope_lock`)
   - dashboard execution scope lock (`stage`, `aws_region`, `single_scope_lock`)
   - temporary + final dashboard URLs
3. Initialize inventory files by copying `INVENTORY_TEMPLATES/*.csv` into a client folder:
   - `INVENTORY/<target_id>/resource_inventory.csv`
   - `INVENTORY/<target_id>/secrets_inventory.csv`
   - `INVENTORY/<target_id>/db_inventory.csv`
   - `INVENTORY/<target_id>/dashboard_inventory.csv`
4. Update `STATUS_BOARD.yaml`:
   - `active_target`
   - `active_validation_goal`
   - task list for active milestones/tracks
5. Run `scripts/check_control_plane_consistency.sh`.

## Track A - API Setup
Goal: target API stacks are deployed and smoke-green.

Steps:
1. Confirm deploy scope (`stage`, `region`, `aws_profile`) from `TARGETS/<target_id>.yaml`.
2. Deploy in ordered waves (`deployOrderList`), record per-module status.
3. Run source-account marker scan and remove hardcoded source references.
4. Execute smoke checks on target API URL.
5. Record outputs in `EVIDENCE_LOGS/<date>_<session>.md`.

Exit gate:
- target API URL returns expected statuses for core public/protected routes.
- no untracked hardcoded source-account references in active deploy path.

## Track B - Dashboard Setup
Goal: dashboard is deployed on target infra in a temporary target domain, aligned with target API scope.

Steps:
1. Confirm dashboard scope lock from target YAML (`prod` + `us-east-1` in current lane).
2. Ensure dashboard repo is isolated from legacy push paths.
3. Complete dashboard infra inventory and endpoint mapping (legacy -> target).
4. Deploy dashboard to temporary target URL (do not modify legacy DNS/custom domain).
5. Run dashboard smoke checks (public routes, auth wiring, API calls to target endpoint).
6. Record evidence and update status board.

Exit gate:
- dashboard temporary URL is live and stable.
- runtime calls target API profile (not legacy API profile).
- final cutover remains a separate gated task.

## Track C - Build Tooling Setup
Goal: mobile builds reproducibly consume target API profile.

Steps:
1. Set canonical repos/branches in target YAML.
2. Verify build reset behavior:
   - build scripts reset to `origin/<branch>`
   - `HEAD == origin/<branch>`
   - `origin/<branch>` hash equals `git ls-remote`
3. Run iOS signing preflight in the same shell that will run the iOS build:
   - `source ~/.crowdaa/IOSBuildEnv.sh`
   - verify `MATCH_PASSWORD` is set (for example: `echo "MATCH_PASSWORD_set=${MATCH_PASSWORD:+yes}"`)
   - export explicit team context from the app Apple account record: `TEAM_ID`, `ITC_TEAM_ID`, `APP_IDENTIFIER`
   - run:
     - `fastlane match appstore --readonly true --team_id "$TEAM_ID" --app_identifier "$APP_IDENTIFIER" --git_branch "$TEAM_ID" --verbose`
   - fail fast: if preflight fails, stop and remediate before `buildIosV2`
4. Confirm app env points to target API URL + API key.
5. Run contract check script with app env file.
6. Run Android/iOS builds and capture logs/artifacts.

Exit gate:
- builds are green or blocked with reproducible blocker and remediation.
- contract check is green against target API profile.
- iOS signing preflight (`match --readonly`) is green in the build shell context before iOS execution.

## Track D - DB Setup
Goal: production data path is formalized (bridge or migrated).

Steps:
1. Select DB runtime mode:
   - `temporary_legacy_bridge`
   - `full_target_db_migration`
2. Complete DB inventory:
   - collections
   - index parity
   - critical appId entity checks
3. Capture baseline runtime checks before DB wiring changes (smoke/UAT/dashboard validators).
4. Generate source/target snapshots and parity evidence using:
   - `scripts/db_snapshot_inventory.sh`
   - `scripts/db_compare_inventory.sh`
   - `scripts/db_canary_queries.sh`
   - Important: keep a source snapshot captured at dump-time and compare target against that snapshot for point-in-time parity.
   - Live source-vs-target compares after long restore windows will naturally drift on mutable collections.
5. Execute migration with one controlled method:
   - `scripts/db_replicate_dump_restore.sh`
   - or Atlas live migration with equivalent evidence.
   - Before long-running restore, re-check Atlas network allowlist against current migration host public IP.
6. Keep API wiring unchanged until all DB parity gates are green.
7. Cut over DB URI at the final step only, then redeploy impacted services.
8. Re-run smoke + UAT + dashboard checks after DB path update.
9. Record post-DB validation and residual risks.

Exit gate:
- DB mode and rollback are documented.
- API + dashboard + app UAT remain green with the selected DB mode.

## Multi-Agent / Multi-Session Rules (Mandatory)
- No status updates without objective evidence file.
- One task owner at a time per `STATUS_BOARD.yaml` task.
- No concurrent edits on the same file by multiple agents.
- Do not write plaintext secrets in docs.
- Endpoint/domain changes must be reflected in target YAML + evidence + status board pointers.
- At each session start/end, follow `migration_control/README.md` protocols.

## Definition of "Repeatable for Next Client"
Process is considered repeatable only when:
1. a new target profile is created from template,
2. all four inventory files are filled,
3. Track A, B, C, and D exit gates are each met with evidence,
4. control-plane consistency check passes before and after each track.
