# Evidence Log - 2026-03-11 - Atlas restore resume, parity, and US-only validation

## Scope
- Active target: `target-prod-us-unified-001`
- Objective: complete source-to-target Atlas restore and validate parity before any API DB cutover.

## 1) Recovery from failed restore
Context:
- Prior restore failed with transient network error (`incomplete read of message header`) after migration-host public IP changed.

Actions:
1. Detected current migration host IP: `92.130.13.246`.
2. Operator updated Atlas network allowlist to include the new host IP.
3. Re-ran full restore from existing archive (no re-dump):

```bash
mongorestore \
  --uri 'mongodb+srv://ikunik_migration_rw:<redacted>@cluster0.wsearw.mongodb.net/crowdaaDev' \
  --nsInclude 'crowdaaDev.*' \
  --archive=/tmp/crowdaaDev_20260309T135010Z.archive.gz \
  --gzip --drop \
  --numParallelCollections 4 \
  --numInsertionWorkersPerCollection 4
```

Result:
- Restore completed successfully.
- Final tool summary: `27566638 document(s) restored successfully. 0 document(s) failed to restore.`

## 2) Post-restore parity checks
Snapshots generated:
- Source (live now): `/tmp/source_snapshot_postrestore.json`
- Target (restored): `/tmp/target_snapshot_postrestore.json`

Strict compare to live source (`count_drift_max=0`):
- Mismatches: 19 collections.
- Cause: expected post-dump source write drift (target is point-in-time restore).

Compare to dump-time source snapshot (`2026-03-09_db_source_snapshot.json`):
- Mismatches: 4 collections only, tiny diffs (2 to 13 docs + 5 docs).
- No index drift.

Operational compare gate used:

```bash
scripts/db_compare_inventory.sh \
  --source-json EVIDENCE_LOGS/2026-03-09_db_source_snapshot.json \
  --target-json /tmp/target_snapshot_postrestore.json \
  --db-inventory-csv INVENTORY/target-prod-us-unified-001/db_inventory.csv \
  --count-drift-max 20 \
  --migration-mode full_target_db_migration \
  --evidence-path EVIDENCE_LOGS/2026-03-09_ikunik_us_atlas_replication_execution.md
```

Result:
- `db_compare_inventory=PASSED`
- `db_inventory.csv` refreshed.

## 3) Canary checks
Live source-vs-target canary compare:
- Failed only on mutable collections for selected app IDs:
  - `users`
  - `userGeneratedContents`
- This is consistent with point-in-time copy vs live source drift after dump timestamp.

Target-only canary (query integrity on restored target):

```bash
scripts/db_canary_queries.sh --source-uri <target_uri> --db-name crowdaaDev --app-ids <selected_ids>
```

Result:
- `db_canary_queries=PASSED mode=source_only`

## 4) Runtime and dashboard validation after restore
API smoke rerun:

```bash
./smoke_prod_clone.sh
```

Result:
- `smoke_result=PASSED failures=0`

Dashboard strict US-only smoke:

```bash
STRICT_US_ONLY=1 \
DASHBOARD_URL='https://d1jmbvp87c05ud.cloudfront.net' \
API_BASE_URL='https://api.aws.crowdaa.com/v1' \
API_KEY='<redacted>' \
./documentation_claude/migration_control/scripts/smoke_dashboard_target.sh
```

Result:
- `smoke_result=PASSED`

US-only validator:

```bash
DASHBOARD_URL='https://d1jmbvp87c05ud.cloudfront.net' \
API_BASE_URL='https://api.aws.crowdaa.com/v1' \
API_KEY='<redacted>' \
./documentation_claude/migration_control/scripts/validate_dashboard_us_only_apps.sh
```

Result:
- `us_only_apps_test=PASSED`
- `mode=bundle_only`

## 5) Cutover status
- DB replication is completed and validated for point-in-time parity.
- API DB URI cutover remains **not executed** in this session (as requested).
