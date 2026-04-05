#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  db_compare_inventory.sh \
    --source-json <path> \
    --target-json <path> \
    [--db-inventory-csv <path>] \
    [--count-drift-max <n>] \
    [--migration-mode <mode>] \
    [--evidence-path <path>]

Description:
  Compares source/target DB snapshots and optionally materializes db_inventory.csv rows.
USAGE
}

SOURCE_JSON=""
TARGET_JSON=""
DB_INVENTORY_CSV=""
COUNT_DRIFT_MAX="0"
MIGRATION_MODE="full_target_db_migration"
EVIDENCE_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-json)
      SOURCE_JSON="${2:-}"
      shift 2
      ;;
    --target-json)
      TARGET_JSON="${2:-}"
      shift 2
      ;;
    --db-inventory-csv)
      DB_INVENTORY_CSV="${2:-}"
      shift 2
      ;;
    --count-drift-max)
      COUNT_DRIFT_MAX="${2:-0}"
      shift 2
      ;;
    --migration-mode)
      MIGRATION_MODE="${2:-full_target_db_migration}"
      shift 2
      ;;
    --evidence-path)
      EVIDENCE_PATH="${2:-}"
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

if [[ -z "${SOURCE_JSON}" || -z "${TARGET_JSON}" ]]; then
  usage
  exit 1
fi

if [[ ! -f "${SOURCE_JSON}" || ! -f "${TARGET_JSON}" ]]; then
  echo "Snapshot file missing." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
export NODE_PATH="${ROOT_DIR}/node_modules${NODE_PATH:+:${NODE_PATH}}"

SOURCE_JSON="${SOURCE_JSON}" \
TARGET_JSON="${TARGET_JSON}" \
DB_INVENTORY_CSV="${DB_INVENTORY_CSV}" \
COUNT_DRIFT_MAX="${COUNT_DRIFT_MAX}" \
MIGRATION_MODE="${MIGRATION_MODE}" \
EVIDENCE_PATH="${EVIDENCE_PATH}" \
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const sourceJson = process.env.SOURCE_JSON;
const targetJson = process.env.TARGET_JSON;
const dbInventoryCsv = process.env.DB_INVENTORY_CSV || '';
const countDriftMax = Number(process.env.COUNT_DRIFT_MAX || '0');
const migrationMode = process.env.MIGRATION_MODE || 'full_target_db_migration';
const evidencePath = process.env.EVIDENCE_PATH || '';

const parseSnapshot = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const source = parseSnapshot(sourceJson);
const target = parseSnapshot(targetJson);

const sourceMap = new Map(source.collections.map((c) => [c.collection, c]));
const targetMap = new Map(target.collections.map((c) => [c.collection, c]));
const collections = Array.from(
  new Set([...sourceMap.keys(), ...targetMap.keys()])
).sort((a, b) => a.localeCompare(b));

const rows = [];
const mismatches = [];

for (const name of collections) {
  const s = sourceMap.get(name);
  const t = targetMap.get(name);
  const sourceCount = s ? s.count : 0;
  const targetCount = t ? t.count : 0;
  const sourceIndexCount = s ? s.indexCount : 0;
  const targetIndexCount = t ? t.indexCount : 0;
  const countDiff = Math.abs(sourceCount - targetCount);
  const missingOnTarget = !t;
  const missingOnSource = !s;
  const indexDiff = sourceIndexCount !== targetIndexCount;
  const countDrift = countDiff > countDriftMax;

  const hasMismatch = missingOnTarget || missingOnSource || indexDiff || countDrift;
  if (hasMismatch) {
    mismatches.push({
      collection: name,
      sourceCount,
      targetCount,
      sourceIndexCount,
      targetIndexCount,
      countDiff,
      missingOnTarget,
      missingOnSource,
      indexDiff,
      countDrift,
    });
  }

  rows.push({
    collectionName: name,
    sourceCount,
    targetCount,
    sourceIndexCount,
    targetIndexCount,
    status: hasMismatch ? 'blocked' : 'done',
    notes: hasMismatch
      ? `countDiff=${countDiff};indexDiff=${indexDiff};missingTarget=${missingOnTarget};missingSource=${missingOnSource}`
      : 'parity_ok',
  });
}

const summary = {
  comparedAt: new Date().toISOString(),
  sourceSnapshot: sourceJson,
  targetSnapshot: targetJson,
  collectionsCompared: collections.length,
  mismatches: mismatches.length,
  countDriftMax,
};

console.log(
  `db_compare_inventory=SUMMARY collections=${summary.collectionsCompared} mismatches=${summary.mismatches} count_drift_max=${countDriftMax}`
);

if (dbInventoryCsv) {
  fs.mkdirSync(path.dirname(dbInventoryCsv), { recursive: true });
  const header =
    'collection_name,app_scope,source_doc_count,target_doc_count,source_index_count,target_index_count,migration_mode,validation_query,status,evidence_path,notes';
  const data = rows.map((row) =>
    [
      row.collectionName,
      'global',
      row.sourceCount,
      row.targetCount,
      row.sourceIndexCount,
      row.targetIndexCount,
      migrationMode,
      `"db.${row.collectionName}.countDocuments({})"`,
      row.status,
      evidencePath,
      row.notes,
    ].join(',')
  );
  fs.writeFileSync(dbInventoryCsv, `${header}\n${data.join('\n')}\n`, 'utf8');
  console.log(`db_compare_inventory=CSV_WRITTEN path=${dbInventoryCsv}`);
}

if (mismatches.length > 0) {
  const preview = mismatches.slice(0, 20);
  console.error(`db_compare_inventory=FAILED mismatch_count=${mismatches.length}`);
  console.error(JSON.stringify(preview, null, 2));
  process.exit(1);
}

console.log('db_compare_inventory=PASSED');
NODE
