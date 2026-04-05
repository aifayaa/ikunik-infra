# Dashboard Deployment Runbook (Next Client)

Last updated: 2026-03-08

## Objective
Deploy the dashboard on target infrastructure without impacting legacy dashboard infrastructure, using a repeatable process that survives multi-agent and multi-session execution.

## Scope Lock (Mandatory)
- Keep a single active dashboard scope until explicitly expanded:
  - `stage: prod`
  - `serverless_region_key: us`
  - `aws_region: us-east-1`
- Keep API scope aligned to the same target lane (`prod` + `us-east-1`).
- Any scope change (extra stage/region) requires:
  1. ADR entry in `DECISIONS.md`
  2. target profile update in `TARGETS/<target_id>.yaml`
  3. status board task + evidence update

## Temporary Domain Strategy (Before Final DNS)
Use a temporary target-only dashboard URL first.

Policy:
- Do not modify legacy dashboard DNS during validation.
- Publish dashboard to target infra and expose via temporary raw target domain (recommended: CloudFront default domain).
- Keep final custom-domain cutover as a separate gated step.

Required target profile fields:
- `runtime_endpoints.dashboard_temp_url`
- `runtime_endpoints.dashboard_final_url`
- `dashboard_deployment.temporary_domain_strategy.*`

## Historical Domain Reuse Warning (Mandatory)
- The same CloudFront domain may still serve a previously deployed FR bundle if no new target deploy occurred.
- Do not treat domain ownership or HTTP 200 as proof of US-only runtime correctness.
- For every deploy, inspect the deployed JS bundle via mandatory validators below; deployment is invalid if forbidden FR/preprod tokens are present.

## Repo Isolation Policy
- Use a dedicated dashboard repo clone for target lane work.
- Keep legacy remote fetch-only (push disabled).
- Push target changes only to target owner repo.
- Record repo/remotes and branch in evidence.

## Execution Sequence
1. Read `MIGRATION_CHARTER.md`, `NEXT_CLIENT_REPLICATION_FRAMEWORK.md`, `DOC_CONSISTENCY_RULES.md`, and active `TARGETS/<target_id>.yaml`.
2. Confirm locked scope and temporary domain strategy in target profile.
3. Build infra-specific inventory for dashboard:
   - API URLs
   - dashboard URLs
   - legacy fallback URLs
   - analytics/monitoring keys (names only, no secret values)
4. Prepare deploy lane for target dashboard repo and target AWS profile.
5. Deploy dashboard to temporary target domain.
6. Run dashboard smoke validation (strict US-only check required):
   - `STRICT_US_ONLY=1 DASHBOARD_URL=<...> API_BASE_URL=<...> API_KEY=<...> scripts/smoke_dashboard_target.sh`
   - this must pass both expected-target checks and forbidden-token checks.
7. Run US-only apps validation:
   - `DASHBOARD_URL=<...> API_BASE_URL=<...> API_KEY=<...> scripts/validate_dashboard_us_only_apps.sh`
8. Record evidence and update `STATUS_BOARD.yaml`.
   - A green result from expected string presence alone is insufficient; forbidden token checks must pass in both scripts.

## Multi-Agent Operating Model
Use one active task owner per task in `STATUS_BOARD.yaml`.

Suggested split:
- Agent A: deployment config and CI/runtime env alignment.
- Agent B: endpoint/domain inventory and dashboard smoke checks.
- Agent C: documentation/status consistency and handoff artifacts.

Coordination rules:
- No two agents update the same file simultaneously.
- Every task transition requires evidence path.
- If a blocker appears, set task to `blocked` with exact blocker and remediation.

## Multi-Session Continuity Rules
At session start:
1. Read `STATUS_BOARD.yaml`.
2. Read latest `EVIDENCE_LOGS/*.md`.
3. Continue only `pending`/`in_progress` dashboard tasks.

At session end:
1. Update task statuses and `meta.updated_at`.
2. Append evidence file with date-stamped commands/results summary.
3. Add ADR if scope/policy changed.

## Exit Gates
Dashboard track is green only when:
- temporary dashboard URL is live and stable,
- dashboard calls target API (not legacy API),
- mandatory validation sequence is green (`smoke_dashboard_target.sh` with `STRICT_US_ONLY=1`, then `validate_dashboard_us_only_apps.sh`),
- no undocumented legacy domains remain in active dashboard runtime path,
- evidence and status board are updated and consistent.

## Cutover Prerequisites (Later)
Before final custom domain switch:
- TLS/ACM ready for target custom domain.
- DNS plan with rollback window approved.
- post-cutover smoke checklist prepared.
- use `DASHBOARD_DNS_CUTOVER_CHECKLIST.md` as the execution checklist.
