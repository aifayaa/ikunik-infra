# Doc Consistency Rules

Last updated: 2026-03-08

## Purpose
Prevent drift between target configuration, scripts, evidence, and status board across multi-session Codex execution.

## Rule 1 - Single Active Target
- `STATUS_BOARD.yaml` `meta.active_target` must match one file in `TARGETS/`.
- All current-session evidence must explicitly reference that same target id.
- Any superseded target profile/inventory must be explicitly marked `archived` and must not be referenced by new execution tasks.

## Rule 2 - Endpoint Consistency
When target API base URL changes, update all of:
1. `TARGETS/<target_id>.yaml` `runtime_endpoints.api_base_url`
2. smoke/UAT defaults or their documented overrides
3. latest evidence log with absolute date and reason

When dashboard temporary/final URL changes, update all of:
1. `TARGETS/<target_id>.yaml` `runtime_endpoints.dashboard_temp_url` and/or `runtime_endpoints.dashboard_final_url`
2. dashboard runbook/evidence entry describing why and when
3. `STATUS_BOARD.yaml` task evidence pointer for the affected dashboard task

## Rule 3 - Repo/Branch Consistency
Target YAML repos/branches must match the repos actually used in build commands.
If temporary execution clones are used, document them in evidence with why and duration.

## Rule 4 - Status Board Freshness
At session end:
- update `STATUS_BOARD.yaml` `meta.updated_at`
- move task statuses (`pending`, `in_progress`, `blocked`, `done`)
- attach evidence path for each moved task

## Rule 5 - Evidence Before Claims
No "green" claim is allowed unless the corresponding command output exists in:
- `EVIDENCE_LOGS/<date>_<session>.md`
- or a referenced raw log file path.

## Rule 6 - Secrets Hygiene
- Never write secret values.
- Use key names, paths, and rotation ownership only.
- Any accidental plaintext must be removed before commit.

## Rule 7 - DB Mode Declaration
`database_runtime_mode.mode` in target YAML is mandatory and must be one of:
- `temporary_legacy_bridge`
- `full_target_db_migration`

Any mode switch must include:
- switch date
- impacted services
- rollback procedure reference.

## Rule 8 - Date Precision
Use absolute dates in all evidence and decisions:
- format `YYYY-MM-DD` for logs and documents
- format `YYYY-MM-DDTHH:MM:SSZ` for status board timestamps.

## Rule 9 - Single Scope Lock (API + Dashboard)
Active migration lane must keep one explicit scope lock in `TARGETS/<target_id>.yaml`:
- `execution_scope.stage` + `execution_scope.region` + `execution_scope.single_scope_lock=true`
- `dashboard_deployment.stage` + `dashboard_deployment.aws_region` + `dashboard_deployment.single_scope_lock=true`

Any expansion to multiple regions/stages requires:
1. ADR in `DECISIONS.md`
2. explicit scope matrix update in target YAML
3. new status-board tasks and evidence references

## Rule 10 - Dashboard Validation Sequence Is Mandatory
- Historical warning: CloudFront domain reuse can serve old FR bundles when a deploy did not refresh assets.
- After every dashboard deploy, run this exact sequence:
  1. `STRICT_US_ONLY=1 DASHBOARD_URL=<...> API_BASE_URL=<...> API_KEY=<...> scripts/smoke_dashboard_target.sh`
  2. `DASHBOARD_URL=<...> API_BASE_URL=<...> API_KEY=<...> scripts/validate_dashboard_us_only_apps.sh`
- A green result from expected string-presence alone is invalid; forbidden-token checks must pass.
- Evidence must include command lines and PASS/FAIL output for both scripts before setting any dashboard task to `done`.
