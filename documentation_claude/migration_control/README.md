# Ikunik Platform Migration Control Plane

Last updated: 2026-03-11

This directory is the single source of truth for multi-session / multi-agent migration work for the **Ikunik Platform**.

## Active Canonical Target (Current)
- `target-prod-us-unified-001`
- API: `https://api.aws.crowdaa.com/v1`
- Scope lock: `prod` + `us-east-1`

## Historical Domain Reuse Warning (Mandatory)
- CloudFront dashboard domains can be reused and may still point to historical FR bundles if a fresh deploy was not completed.
- A 200 response or basic target-string presence is not sufficient to mark deploy as green.
- Bundle inspection via required validators is mandatory on every deploy.

Required post-deploy validation order:
1. `STRICT_US_ONLY=1 DASHBOARD_URL=<...> API_BASE_URL=<...> API_KEY=<...> scripts/smoke_dashboard_target.sh`
2. `DASHBOARD_URL=<...> API_BASE_URL=<...> API_KEY=<...> scripts/validate_dashboard_us_only_apps.sh`

Notes:
- `validate_dashboard_us_only_apps.sh` runs `bundle_only` mode when dashboard test credentials are not provided.
- To validate authenticated app listing (`/apps`), provide `DASHBOARD_TEST_EMAIL` and `DASHBOARD_TEST_PASSWORD`.

Deploy is valid only if both commands pass including forbidden-token checks.

## Purpose
- Keep migration context in git files (not in chat memory).
- Guarantee continuity between Codex sessions.
- Ensure isolation from the legacy Crowdaa platform while cloning toward Ikunik target infra.

## Session Start Protocol
1. Read `STATUS_BOARD.yaml`.
2. Read latest file in `EVIDENCE_LOGS/`.
3. Read `DECISIONS.md`.
4. Pick only tasks marked `pending`/`in_progress` from the active milestone.
5. Execute, then write evidence + update `STATUS_BOARD.yaml`.

## Session End Protocol
1. Update `STATUS_BOARD.yaml` statuses and timestamps.
2. Append objective evidence to `EVIDENCE_LOGS/<date>_<session>.md`.
3. Record any new decision in `DECISIONS.md`.
4. Produce handoff using `HANDOFF_TEMPLATE.md`.

## Core Files
- `MIGRATION_CHARTER.md`: scope, constraints, and non-negotiables.
- `TARGETS/*.yaml`: target-specific parameters.
- `LEGACY_MARKERS.md`: forbidden legacy values and regex checks.
- `WORKPLAN.md`: milestone definitions and acceptance gates.
- `AWS_ACCOUNT_SETUP_NEXT_CLIENT_RUNBOOK.md`: account/bootstrap procedure for source + target + operator roles.
- `DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md`: dashboard isolation + temporary-domain deployment procedure.
- `DASHBOARD_DNS_CUTOVER_CHECKLIST.md`: final dashboard custom-domain cutover and rollback checklist.
- `STATUS_BOARD.yaml`: machine-readable state board.
- `DECISIONS.md`: architecture/operation decisions.
- `HANDOFF_TEMPLATE.md`: required handoff structure.
- `STARTUP_PROMPTS.md`: reusable prompt templates for new Codex sessions.

## Replication Kit (Next Client)
- `NEXT_CLIENT_REPLICATION_FRAMEWORK.md`: canonical API -> dashboard -> build tooling -> DB execution sequence.
- `DOC_CONSISTENCY_RULES.md`: hard rules to keep docs/scripts/status aligned across sessions.
- `TARGETS/target-template-next-client.yaml`: target profile template for onboarding a new client.
- `INVENTORY_TEMPLATES/*.csv`: mandatory inventory files (resource, secrets, db, dashboard) to fill before cutover.
- `scripts/check_control_plane_consistency.sh`: consistency preflight check.
- `scripts/smoke_dashboard_target.sh`: dashboard-to-target-API smoke validation.
- `scripts/validate_dashboard_us_only_apps.sh`: US-only app/bundle validation with forbidden-token enforcement.
- `scripts/db_snapshot_inventory.sh`: DB collection/index snapshot generator.
- `scripts/db_compare_inventory.sh`: source/target DB parity comparison + optional `db_inventory.csv` materialization.
- `scripts/db_canary_queries.sh`: critical appId canary count checks on source/target.
- `scripts/db_replicate_dump_restore.sh`: controlled dump/restore replication helper.

DB parity guidance:
- Use dump-time source snapshot as canonical parity reference for point-in-time restore validation.
- Live source-vs-target count checks after long restores will show expected drift on mutable collections.

## Mandatory Read Order (New Client)
1. `MIGRATION_CHARTER.md`
2. `NEXT_CLIENT_REPLICATION_FRAMEWORK.md`
3. `WORKPLAN.md`
4. `AWS_ACCOUNT_SETUP_NEXT_CLIENT_RUNBOOK.md`
5. `DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md`
6. `TARGETS/<target_id>.yaml`
7. `DOC_CONSISTENCY_RULES.md`
8. `STATUS_BOARD.yaml`
9. latest `EVIDENCE_LOGS/*.md`

## Raw Transcript Archive
- `EVIDENCE_LOGS/2026-03-03_atlas_agent_mode_aws_setup_raw_script.md`: preserved raw script used in browser-agent AWS setup session.
