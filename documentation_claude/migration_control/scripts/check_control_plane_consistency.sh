#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_FILE="${ROOT_DIR}/STATUS_BOARD.yaml"
TARGETS_DIR="${ROOT_DIR}/TARGETS"
SMOKE_SCRIPT="$(cd "${ROOT_DIR}/../.." && pwd)/smoke_prod_clone.sh"
UAT_SCRIPT="$(cd "${ROOT_DIR}/../.." && pwd)/uat_options_abc.sh"

FAILURES=0

fail() {
  echo "[FAIL] $1"
  FAILURES=$((FAILURES + 1))
}

ok() {
  echo "[OK] $1"
}

require_file() {
  local path="$1"
  if [[ -f "${path}" ]]; then
    ok "file exists: ${path}"
  else
    fail "missing file: ${path}"
  fi
}

read_block_field() {
  local file="$1"
  local block="$2"
  local field="$3"
  awk -v block="${block}" -v field="${field}" '
    $0 ~ "^" block ":" { in_block=1; next }
    in_block && $0 ~ "^[^[:space:]]" { in_block=0 }
    in_block {
      line=$0
      gsub(/^[[:space:]]+/, "", line)
      if (line ~ "^" field ":") {
        sub("^" field ":[[:space:]]*", "", line)
        print line
        exit
      }
    }
  ' "${file}"
}

require_file "${STATUS_FILE}"
require_file "${ROOT_DIR}/README.md"
require_file "${ROOT_DIR}/MIGRATION_CHARTER.md"
require_file "${ROOT_DIR}/WORKPLAN.md"
require_file "${ROOT_DIR}/DOC_CONSISTENCY_RULES.md"
require_file "${ROOT_DIR}/NEXT_CLIENT_REPLICATION_FRAMEWORK.md"
require_file "${ROOT_DIR}/DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md"
require_file "${ROOT_DIR}/DASHBOARD_DNS_CUTOVER_CHECKLIST.md"
require_file "${ROOT_DIR}/TARGETS/target-template-next-client.yaml"
require_file "${ROOT_DIR}/INVENTORY_TEMPLATES/resource_inventory_template.csv"
require_file "${ROOT_DIR}/INVENTORY_TEMPLATES/secrets_inventory_template.csv"
require_file "${ROOT_DIR}/INVENTORY_TEMPLATES/db_inventory_template.csv"
require_file "${ROOT_DIR}/INVENTORY_TEMPLATES/dashboard_inventory_template.csv"
require_file "${ROOT_DIR}/scripts/smoke_dashboard_target.sh"
require_file "${ROOT_DIR}/scripts/db_snapshot_inventory.sh"
require_file "${ROOT_DIR}/scripts/db_compare_inventory.sh"
require_file "${ROOT_DIR}/scripts/db_canary_queries.sh"
require_file "${ROOT_DIR}/scripts/db_replicate_dump_restore.sh"
require_file "${ROOT_DIR}/scripts/db_run_replication_validation.sh"
require_file "${SMOKE_SCRIPT}"
require_file "${UAT_SCRIPT}"

ACTIVE_TARGET="$(rg -n "^  active_target:" "${STATUS_FILE}" | head -1 | sed -E "s/.*active_target: *//; s/'//g")"
UPDATED_AT="$(rg -n "^  updated_at:" "${STATUS_FILE}" | head -1 | sed -E "s/.*updated_at: *//; s/'//g")"

if [[ -z "${ACTIVE_TARGET}" ]]; then
  fail "STATUS_BOARD.yaml missing meta.active_target"
else
  ok "active target: ${ACTIVE_TARGET}"
fi

if [[ "${UPDATED_AT}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]; then
  ok "status board timestamp present: ${UPDATED_AT}"
else
  fail "meta.updated_at should be ISO-8601 UTC, got: ${UPDATED_AT:-<empty>}"
fi

TARGET_FILE="${TARGETS_DIR}/${ACTIVE_TARGET}.yaml"
require_file "${TARGET_FILE}"
if [[ -d "${ROOT_DIR}/INVENTORY/${ACTIVE_TARGET}" ]]; then
  ok "inventory folder exists for active target: ${ROOT_DIR}/INVENTORY/${ACTIVE_TARGET}"
else
  fail "missing inventory folder for active target: ${ROOT_DIR}/INVENTORY/${ACTIVE_TARGET}"
fi

ACTIVE_INVENTORY_DIR="${ROOT_DIR}/INVENTORY/${ACTIVE_TARGET}"
for required_inventory in resource_inventory.csv secrets_inventory.csv db_inventory.csv dashboard_inventory.csv; do
  if [[ -f "${ACTIVE_INVENTORY_DIR}/${required_inventory}" ]]; then
    ok "active target inventory file exists: ${ACTIVE_INVENTORY_DIR}/${required_inventory}"
  else
    fail "missing active target inventory file: ${ACTIVE_INVENTORY_DIR}/${required_inventory}"
  fi
done

TARGET_ID="$(rg "^id:" "${TARGET_FILE}" | head -1 | sed -E "s/^id: *//")"
TARGET_API="$(read_block_field "${TARGET_FILE}" "runtime_endpoints" "api_base_url")"
TARGET_DASHBOARD_TEMP="$(read_block_field "${TARGET_FILE}" "runtime_endpoints" "dashboard_temp_url")"
TARGET_DASHBOARD_FINAL="$(read_block_field "${TARGET_FILE}" "runtime_endpoints" "dashboard_final_url")"
TARGET_SCOPE_LOCK="$(read_block_field "${TARGET_FILE}" "execution_scope" "single_scope_lock")"
TARGET_DASHBOARD_SCOPE_LOCK="$(read_block_field "${TARGET_FILE}" "dashboard_deployment" "single_scope_lock")"
TARGET_DASHBOARD_STAGE="$(read_block_field "${TARGET_FILE}" "dashboard_deployment" "stage")"
TARGET_DASHBOARD_REGION="$(read_block_field "${TARGET_FILE}" "dashboard_deployment" "aws_region")"
DB_MODE="$(read_block_field "${TARGET_FILE}" "database_runtime_mode" "mode")"

if [[ "${TARGET_ID}" == "${ACTIVE_TARGET}" ]]; then
  ok "target id matches active target"
else
  fail "target id (${TARGET_ID}) does not match active target (${ACTIVE_TARGET})"
fi

if [[ "${TARGET_API}" =~ ^https:// ]]; then
  ok "target api base url present: ${TARGET_API}"
else
  fail "target api base url missing or invalid in ${TARGET_FILE}"
fi

if [[ -n "${TARGET_DASHBOARD_TEMP}" ]]; then
  ok "dashboard temporary url field present: ${TARGET_DASHBOARD_TEMP}"
else
  fail "dashboard temporary url missing in ${TARGET_FILE}"
fi

if [[ -n "${TARGET_DASHBOARD_FINAL}" ]]; then
  ok "dashboard final url field present: ${TARGET_DASHBOARD_FINAL}"
else
  fail "dashboard final url missing in ${TARGET_FILE}"
fi

if [[ "${TARGET_SCOPE_LOCK}" == "true" ]]; then
  ok "execution scope lock enabled"
else
  fail "execution_scope.single_scope_lock must be true in ${TARGET_FILE}"
fi

if [[ "${TARGET_DASHBOARD_SCOPE_LOCK}" == "true" ]]; then
  ok "dashboard scope lock enabled"
else
  fail "dashboard_deployment.single_scope_lock must be true in ${TARGET_FILE}"
fi

if [[ -n "${TARGET_DASHBOARD_STAGE}" && -n "${TARGET_DASHBOARD_REGION}" ]]; then
  ok "dashboard scope fields present: stage=${TARGET_DASHBOARD_STAGE} region=${TARGET_DASHBOARD_REGION}"
else
  fail "dashboard_deployment stage/region fields are missing in ${TARGET_FILE}"
fi

if [[ "${DB_MODE}" == "temporary_legacy_bridge" || "${DB_MODE}" == "full_target_db_migration" || "${DB_MODE}" == "temporary_legacy_atlas" ]]; then
  ok "database runtime mode declared: ${DB_MODE}"
else
  fail "unsupported database_runtime_mode.mode in ${TARGET_FILE}: ${DB_MODE}"
fi

SMOKE_BASE="$(rg -n '^BASE_URL="\$\{BASE_URL:-' "${SMOKE_SCRIPT}" | head -1 | sed -E 's/.*:-([^}]*)\}.*/\1/')"
UAT_BASE="$(rg -n '^BASE_URL="\$\{BASE_URL:-' "${UAT_SCRIPT}" | head -1 | sed -E 's/.*:-([^}]*)\}.*/\1/')"

if [[ "${SMOKE_BASE}" == "${TARGET_API}" ]]; then
  ok "smoke default base url matches target"
else
  fail "smoke default base url (${SMOKE_BASE}) does not match target api (${TARGET_API})"
fi

if [[ "${UAT_BASE}" == "${TARGET_API}" ]]; then
  ok "uat default base url matches target"
else
  fail "uat default base url (${UAT_BASE}) does not match target api (${TARGET_API})"
fi

LATEST_EVIDENCE="$(ls -1t "${ROOT_DIR}/EVIDENCE_LOGS"/*.md 2>/dev/null | head -1 || true)"
if [[ -n "${LATEST_EVIDENCE}" ]]; then
  ok "latest evidence found: ${LATEST_EVIDENCE}"
else
  fail "no markdown evidence files found in EVIDENCE_LOGS"
fi

if [[ "${FAILURES}" -gt 0 ]]; then
  echo "consistency_result=FAILED failures=${FAILURES}"
  exit 1
fi

echo "consistency_result=PASSED failures=0"
