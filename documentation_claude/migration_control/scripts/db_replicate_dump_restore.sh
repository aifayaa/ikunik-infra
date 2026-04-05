#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  db_replicate_dump_restore.sh \
    --source-uri <uri> \
    --target-uri <uri> \
    --db-name <db> \
    [--archive <path>]

Description:
  Performs full DB copy using mongodump + mongorestore.
  This script is intended for controlled migration windows.
USAGE
}

SOURCE_URI=""
TARGET_URI=""
DB_NAME=""
ARCHIVE=""

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
    --archive)
      ARCHIVE="${2:-}"
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

if [[ -z "${SOURCE_URI}" || -z "${TARGET_URI}" || -z "${DB_NAME}" ]]; then
  usage
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1 || ! command -v mongorestore >/dev/null 2>&1; then
  echo "db_replicate_dump_restore=FAILED reason=missing_mongodb_database_tools" >&2
  echo "Install: brew install mongodb-database-tools" >&2
  exit 1
fi

if [[ -z "${ARCHIVE}" ]]; then
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  ARCHIVE="/tmp/${DB_NAME}_${TS}.archive.gz"
fi

echo "db_replicate_dump_restore=START db=${DB_NAME} archive=${ARCHIVE}"

mongodump \
  --uri "${SOURCE_URI}" \
  --db "${DB_NAME}" \
  --archive="${ARCHIVE}" \
  --gzip

mongorestore \
  --uri "${TARGET_URI}" \
  --nsInclude "${DB_NAME}.*" \
  --archive="${ARCHIVE}" \
  --gzip \
  --drop

echo "db_replicate_dump_restore=PASSED db=${DB_NAME}"

