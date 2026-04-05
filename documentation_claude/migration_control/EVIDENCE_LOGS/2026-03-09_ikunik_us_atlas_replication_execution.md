# Evidence Log - 2026-03-09 - Ikunik Atlas replication execution (agent run)

## Scope
- Active target: `target-prod-us-unified-001`
- Objective: execute DB replication plan with API cutover at the very end only.

## 1) Preflight and control-plane checks
Commands:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts
./check_control_plane_consistency.sh
./check_isolation.sh
```
Result:
- `consistency_result=PASSED failures=0`
- `Isolation checks passed.`

## 2) Baseline runtime checks (before any DB wiring)
Command set:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra
./smoke_prod_clone.sh
API_KEY=<from SSM> ./uat_options_abc.sh

cd /Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts
STRICT_US_ONLY=1 DASHBOARD_URL=https://d1jmbvp87c05ud.cloudfront.net API_BASE_URL=https://api.aws.crowdaa.com/v1 API_KEY=<from SSM> ./smoke_dashboard_target.sh
DASHBOARD_URL=https://d1jmbvp87c05ud.cloudfront.net API_BASE_URL=https://api.aws.crowdaa.com/v1 API_KEY=<from SSM> ./validate_dashboard_us_only_apps.sh
```
Result:
- API smoke: `smoke_result=PASSED failures=0`
- UAT summary: `pass=56 fail=2`
  - `FAIL C.load.press_articles` (p95 threshold breach)
  - `FAIL GATE.stack_reconcile_green` (missing stack count)
- Dashboard strict smoke: `smoke_result=PASSED`
- Dashboard US-only validator: `us_only_apps_test=PASSED`

Note:
- UAT failures are pre-existing and match historical blocker profile; no DB cutover was performed in this session.

## 3) Runtime parameter discovery
Command:
```bash
AWS_PROFILE=crowdaa AWS_REGION=us-east-1 aws ssm get-parameters-by-path --path /ikunik/prod --recursive --query 'Parameters[].Name' --output text
```
Result:
- Existing Ikunik API-v1 SSM parameters are present for `eu-west-3` path only.
- `/ikunik/prod/us-east-1/api-v1/*` parameters are not present in current account state.

Operational implication:
- Current live DB parameter source for this lane is `/ikunik/prod/eu-west-3/api-v1/mongo-url`.

## 4) DB migration tooling added
Added scripts:
- `documentation_claude/migration_control/scripts/db_snapshot_inventory.sh`
- `documentation_claude/migration_control/scripts/db_compare_inventory.sh`
- `documentation_claude/migration_control/scripts/db_canary_queries.sh`
- `documentation_claude/migration_control/scripts/db_replicate_dump_restore.sh`
- `documentation_claude/migration_control/scripts/db_run_replication_validation.sh`

Also created missing active inventory file:
- `documentation_claude/migration_control/INVENTORY/target-prod-us-unified-001/db_inventory.csv`

## 5) Source DB baseline snapshot and canary
Commands:
```bash
db_snapshot_inventory.sh --mongo-uri <source_uri_from_ssm> --db-name crowdaaDev --out-json EVIDENCE_LOGS/2026-03-09_db_source_snapshot.json --count-mode estimated

db_canary_queries.sh --source-uri <source_uri_from_ssm> --db-name crowdaaDev --app-ids 05e8d798-57b8-413d-b1cc-d81866c01cf0,8f8bc36d-4746-4130-a230-92065641a3a4,d75be5e1-101e-44dd-8796-b1865dd5a1b3,ff9d384a-83b8-4f39-8b7d-7207622e7745,eae6deb6-66dc-4f31-8f5d-e4ebf0889f21
```
Results:
- Source snapshot generated: `collections=142`
- Source canary counts:
  - apps: 5
  - users: 28812
  - pressArticles: 417
  - pressCategories: 117
  - userGeneratedContents: 8993
  - userMetrics: 294106

## 6) Tooling readiness
Installed local Mongo tools:
- `mongodump`
- `mongorestore`
- `mongosh`

## 7) Blocker for continuation
Blocked on target Atlas-side actions not available from local AWS/infra repos:
- target Atlas cluster/URI for Ikunik account
- DB user + network allow-list for migration host
- (optional) Atlas Live Migration setup if chosen instead of dump/restore

No API DB wiring change was made in this session.
Cutover remains gated until full source-vs-target parity is green.

## 8) Post-update consistency recheck
Command:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts
./check_control_plane_consistency.sh
```
Result:
- `consistency_result=PASSED failures=0`

## 9) Atlas target setup status received from operator (2026-03-09)
Operator-provided Atlas status:
- Atlas project id: `69aec79813165dc982127a2b`
- Cluster: `Cluster0` (provisioning), region `AWS us-east-1`
- Migration user: `ikunik_migration_rw` exists and active
- Network allow-list includes migration host `83.198.195.44/32`
- No `0.0.0.0/0` temporary allow-list added

Current blockers:
- Cluster still provisioning: SRV host not available yet, so restore cannot start.
- Migration user is overprivileged (`atlasAdmin` on `admin`), needs least-privilege scope for `crowdaaDev`.
- Cluster rename to `ikunik-prod-target-01` is pending.

Operational note:
- No API DB wiring change was performed.
- Cutover remains final-step only after replication + parity + canary are green.

## 10) Continuation reference
- 2026-03-11 continuation and completion evidence:
  - `EVIDENCE_LOGS/2026-03-11_atlas_restore_resume_and_validation.md`
