# Session Evidence - Replication Kit Consistency Framework

Date: 2026-03-03
Operator: Codex

## Goal
Create a repeatable documentation/inventory framework so future client infra replications can be executed by a fresh Codex agent in deterministic order.

## Changes Applied
- Added `NEXT_CLIENT_REPLICATION_FRAMEWORK.md` with ordered tracks:
  - API setup
  - build tooling setup
  - DB setup
- Added `DOC_CONSISTENCY_RULES.md` with hard consistency rules.
- Added target profile template:
  - `TARGETS/target-template-next-client.yaml`
- Added inventory templates:
  - `INVENTORY_TEMPLATES/resource_inventory_template.csv`
  - `INVENTORY_TEMPLATES/secrets_inventory_template.csv`
  - `INVENTORY_TEMPLATES/db_inventory_template.csv`
  - `INVENTORY_TEMPLATES/README.md`
- Added control-plane consistency preflight script:
  - `scripts/check_control_plane_consistency.sh`
- Updated:
  - `README.md` (read order + replication kit index)
  - `WORKPLAN.md` (ordered execution tracks and mandatory evidence gates)
  - `TARGETS/target-prod-fr-clone-001.yaml` (api base url + db mode normalization)
  - `smoke_prod_clone.sh` default BASE_URL
  - `uat_options_abc.sh` default BASE_URL
  - `STATUS_BOARD.yaml` timestamp
  - `DECISIONS.md` ADR entry

## Intended Replication Effect
- A new client migration can start from templates and one consistency command before any deployment/build step.
- API/build/DB phases now have explicit entry/exit gates and required evidence artifacts.
