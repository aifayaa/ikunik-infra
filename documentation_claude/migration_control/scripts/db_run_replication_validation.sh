#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  db_run_replication_validation.sh \
    --source-uri <uri> \
    --target-uri <uri> \
    --db-name <db> \
    --app-ids <id1,id2,...> \
    --evidence-dir <path> \
    --db-inventory-csv <path> \
    [--count-mode estimated|exact] \
    [--count-drift-max <n>]

Description:
  Executes DB replication + validation workflow without API cutover:
  1) dump/restore source -> target
  2) source/target snapshots
  3) parity compare (+ db_inventory.csv update)
  4) canary compare for critical app IDs
USAGE
}

SOURCE_URI=""
TARGET_URI=""
DB_NAME=""
APP_IDS=""
EVIDENCE_DIR=""
DB_INVENTORY_CSV=""
COUNT_MODE="estimated"
COUNT_DRIFT_MAX="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-uri)
      SOURCE_URI="${2:-}"
      shift 2
      ;;
    --target-uri)
      TARGET_URI="${2:-}"
      shift 2
      ;;
    --db-name)
      DB_NAME="${2:-}"
      shift 2
      ;;
    --app-ids)
      APP_IDS="${2:-}"
      shift 2
      ;;
    --evidence-dir)
      EVIDENCE_DIR="${2:-}"
      shift 2
      ;;
    --db-inventory-csv)
      DB_INVENTORY_CSV="${2:-}"
      shift 2
      ;;
    --count-mode)
      COUNT_MODE="${2:-estimated}"
      shift 2
      ;;
    --count-drift-max)
      COUNT_DRIFT_MAX="${2:-0}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${SOURCE_URI}" || -z "${TARGET_URI}" || -z "${DB_NAME}" || -z "${APP_IDS}" || -z "${EVIDENCE_DIR}" || -z "${DB_INVENTORY_CSV}" ]]; then
  usage
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "${EVIDENCE_DIR}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
SOURCE_SNAPSHOT="${EVIDENCE_DIR}/${TS}_db_source_snapshot.json"
TARGET_SNAPSHOT="${EVIDENCE_DIR}/${TS}_db_target_snapshot.json"
ARCHIVE_PATH="/tmp/${DB_NAME}_${TS}.archive.gz"

echo "db_run_replication_validation=START db=${DB_NAME}"

"${ROOT_DIR}/db_replicate_dump_restore.sh" \
  --source-uri "${SOURCE_URI}" \
  --target-uri "${TARGET_URI}" \
  --db-name "${DB_NAME}" \
  --archive "${ARCHIVE_PATH}"

"${ROOT_DIR}/db_snapshot_inventory.sh" \
  --mongo-uri "${SOURCE_URI}" \
  --db-name "${DB_NAME}" \
  --out-json "${SOURCE_SNAPSHOT}" \
  --count-mode "${COUNT_MODE}"

"${ROOT_DIR}/db_snapshot_inventory.sh" \
  --mongo-uri "${TARGET_URI}" \
  --db-name "${DB_NAME}" \
  --out-json "${TARGET_SNAPSHOT}" \
  --count-mode "${COUNT_MODE}"

"${ROOT_DIR}/db_compare_inventory.sh" \
  --source-json "${SOURCE_SNAPSHOT}" \
  --target-json "${TARGET_SNAPSHOT}" \
  --db-inventory-csv "${DB_INVENTORY_CSV}" \
  --count-drift-max "${COUNT_DRIFT_MAX}" \
  --migration-mode "full_target_db_migration"

"${ROOT_DIR}/db_canary_queries.sh" \
  --source-uri "${SOURCE_URI}" \
  --target-uri "${TARGET_URI}" \
  --db-name "${DB_NAME}" \
  --app-ids "${APP_IDS}"

echo "db_run_replication_validation=PASSED db=${DB_NAME}"

