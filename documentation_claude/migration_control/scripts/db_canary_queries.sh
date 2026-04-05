#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  db_canary_queries.sh \
    --source-uri <uri> \
    --db-name <db> \
    --app-ids <id1,id2,...> \
    [--target-uri <uri>] \
    [--collections <c1,c2,...>]

Description:
  Runs critical canary counts per collection/appId on source DB.
  If --target-uri is provided, compares source vs target and fails on drift.
USAGE
}

SOURCE_URI=""
TARGET_URI=""
DB_NAME=""
APP_IDS=""
COLLECTIONS="apps,users,pressArticles,pressCategories,userGeneratedContents,userMetrics"

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
    --collections)
      COLLECTIONS="${2:-$COLLECTIONS}"
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

if [[ -z "${SOURCE_URI}" || -z "${DB_NAME}" || -z "${APP_IDS}" ]]; then
  usage
  exit 1
fi

TMP_JS="$(mktemp)"
cat > "${TMP_JS}" <<'MJS'
const sourceUri = process.env.SOURCE_URI || '';
const targetUri = process.env.TARGET_URI || '';
const dbName = process.env.DB_NAME || '';
const appIds = (process.env.APP_IDS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const collections = (process.env.COLLECTIONS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

if (!sourceUri || !dbName || appIds.length === 0 || collections.length === 0) {
  print('db_canary_queries=FAILED reason=Missing required inputs');
  quit(1);
}

const buildFilter = (collectionName) => {
  if (collectionName === 'apps') {
    return { _id: { $in: appIds } };
  }
  return {
    $or: [{ appId: { $in: appIds } }, { _id: { $in: appIds } }],
  };
};

const fetchCounts = (uri) => {
  const conn = new Mongo(uri);
  const dbRef = conn.getDB(dbName);
  const out = {};
  for (const collectionName of collections) {
    const filter = buildFilter(collectionName);
    out[collectionName] = dbRef.getCollection(collectionName).countDocuments(filter);
  }
  return out;
};

const sourceCounts = fetchCounts(sourceUri);
print('db_canary_queries=SOURCE');
print(JSON.stringify(sourceCounts, null, 2));

if (!targetUri) {
  print('db_canary_queries=PASSED mode=source_only');
  quit(0);
}

const targetCounts = fetchCounts(targetUri);
print('db_canary_queries=TARGET');
print(JSON.stringify(targetCounts, null, 2));

const mismatches = [];
for (const collectionName of collections) {
  const sourceValue = sourceCounts[collectionName] ?? 0;
  const targetValue = targetCounts[collectionName] ?? 0;
  if (sourceValue !== targetValue) {
    mismatches.push({
      collection: collectionName,
      source: sourceValue,
      target: targetValue,
    });
  }
}

if (mismatches.length > 0) {
  print('db_canary_queries=FAILED');
  print(JSON.stringify(mismatches, null, 2));
  quit(1);
}

print('db_canary_queries=PASSED mode=compare');
MJS

SOURCE_URI="${SOURCE_URI}" \
TARGET_URI="${TARGET_URI}" \
DB_NAME="${DB_NAME}" \
APP_IDS="${APP_IDS}" \
COLLECTIONS="${COLLECTIONS}" \
mongosh "${SOURCE_URI}" --quiet --norc --file "${TMP_JS}"

rm -f "${TMP_JS}"
