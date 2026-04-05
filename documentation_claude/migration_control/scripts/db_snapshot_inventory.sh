#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  db_snapshot_inventory.sh --mongo-uri <uri> --db-name <db> --out-json <path> [--count-mode estimated|exact]

Description:
  Captures per-collection document count and index metadata into a JSON snapshot.
USAGE
}

MONGO_URI=""
DB_NAME=""
OUT_JSON=""
COUNT_MODE="estimated"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mongo-uri)
      MONGO_URI="${2:-}"
      shift 2
      ;;
    --db-name)
      DB_NAME="${2:-}"
      shift 2
      ;;
    --out-json)
      OUT_JSON="${2:-}"
      shift 2
      ;;
    --count-mode)
      COUNT_MODE="${2:-estimated}"
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

if [[ -z "${MONGO_URI}" || -z "${DB_NAME}" || -z "${OUT_JSON}" ]]; then
  usage
  exit 1
fi

if [[ "${COUNT_MODE}" != "estimated" && "${COUNT_MODE}" != "exact" ]]; then
  echo "Invalid --count-mode: ${COUNT_MODE}" >&2
  exit 1
fi

mkdir -p "$(dirname "${OUT_JSON}")"

TMP_JS="$(mktemp)"
cat > "${TMP_JS}" <<'MJS'
const mongoUri = process.env.MONGO_URI || '';
const dbName = process.env.DB_NAME || '';
const countMode = process.env.COUNT_MODE || 'estimated';

if (!dbName) {
  print('db_snapshot_inventory=FAILED reason=Missing DB_NAME');
  quit(1);
}

const maskMongoUri = (uri) => uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
const dbRef = db.getSiblingDB(dbName);
const collections = dbRef.getCollectionNames().sort();

const snapshot = [];
for (const collectionName of collections) {
  const coll = dbRef.getCollection(collectionName);
  const count =
    countMode === 'exact'
      ? coll.countDocuments({})
      : coll.estimatedDocumentCount();
  const indexes = coll.getIndexes();
  snapshot.push({
    collection: collectionName,
    count,
    indexCount: indexes.length,
    indexes: indexes.map((idx) => ({
      name: idx.name,
      key: idx.key,
      unique: Boolean(idx.unique),
      sparse: Boolean(idx.sparse),
      expireAfterSeconds:
        typeof idx.expireAfterSeconds === 'number'
          ? idx.expireAfterSeconds
          : null,
    })),
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  dbName,
  countMode,
  connection: maskMongoUri(mongoUri),
  collections: snapshot,
};

print(JSON.stringify(payload, null, 2));
MJS

SNAPSHOT_JSON="$(
  MONGO_URI="${MONGO_URI}" DB_NAME="${DB_NAME}" COUNT_MODE="${COUNT_MODE}" \
  mongosh "${MONGO_URI}" --quiet --norc --file "${TMP_JS}"
)"

rm -f "${TMP_JS}"

printf '%s\n' "${SNAPSHOT_JSON}" > "${OUT_JSON}"
echo "db_snapshot_inventory=OK db=${DB_NAME} out=${OUT_JSON}"
