# Evidence Log - 2026-03-04 - Dashboard Migration Plan (Single Scope)

## Target
- `target-prod-fr-clone-001`

## Objective
1. Confirm whether current target API lane is single stage/region.
2. Align dashboard planning to the same single scope with temporary domain strategy.
3. Update migration-control documentation for repeatable multi-agent and multi-session execution.

## Verification Snapshot
- `TARGETS/target-prod-fr-clone-001.yaml` currently uses:
  - `execution_scope.stage=prod`
  - `execution_scope.region=eu-west-3`
  - `runtime_endpoints.api_base_url=https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod`
- Dashboard scope fields were added to the same target profile:
  - `dashboard_deployment.stage=prod`
  - `dashboard_deployment.aws_region=eu-west-3`
  - `dashboard_deployment.serverless_region_key=fr`
  - temporary domain strategy set to `temporary_raw_target_domain` with legacy custom domain untouched until cutover.

## Isolation Snapshot
- Dedicated dashboard repo already present: `/Users/crowdaa/Desktop/gits/ikunik-dashboard`
- Remote policy in this lane:
  - legacy remote fetch is allowed
  - legacy push path disabled
  - target owner remote is configured for target migration lane

## Documentation Updated
- `migration_control/DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md` (new)
- `migration_control/NEXT_CLIENT_REPLICATION_FRAMEWORK.md`
- `migration_control/WORKPLAN.md`
- `migration_control/DOC_CONSISTENCY_RULES.md`
- `migration_control/MIGRATION_CHARTER.md`
- `migration_control/README.md`
- `migration_control/STARTUP_PROMPTS.md`
- `migration_control/DECISIONS.md`
- `migration_control/STATUS_BOARD.yaml`
- `migration_control/TARGETS/target-prod-fr-clone-001.yaml`
- `migration_control/TARGETS/target-template-next-client.yaml`
- repo root `README.md` migration runbook links

## New Pending Tasks (status board)
- Build dashboard infra-specific inventory and endpoint mapping.
- Deploy dashboard to temporary target domain.
- Execute dashboard smoke checks.
- Prepare final DNS cutover + rollback checklist.

## Notes
- This session focused on planning/control-plane updates only.
- No dashboard runtime or DNS cutover changes were executed in this session.
