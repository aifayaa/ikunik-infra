#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-https://ooeq303hg5.execute-api.eu-west-3.amazonaws.com/prod}"
API_KEY="${API_KEY:-}"
AWS_PROFILE="${AWS_PROFILE:-crowdaa}"
AWS_REGION="${AWS_REGION:-eu-west-3}"
REPORT_DIR="${REPORT_DIR:-/Users/crowdaa/Desktop/backend_clone_handoff/logs}"
SMOKE_SCRIPT="${SMOKE_SCRIPT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/smoke_prod_clone.sh}"

if [[ -z "${API_KEY}" ]]; then
  echo "ERROR: API_KEY env var is required." >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required." >&2
  exit 2
fi

mkdir -p "${REPORT_DIR}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_FILE="${REPORT_DIR}/uat_options_abc_${TS}.log"
START_MS="$(python3 - <<'PY'
from datetime import datetime, timezone
print(int(datetime.now(timezone.utc).timestamp() * 1000))
PY
)"

exec > >(tee -a "${REPORT_FILE}") 2>&1

PASS_COUNT=0
FAIL_COUNT=0
HTTP_CODE=""
HTTP_BODY=""
CURRENT_USER_ID=""
CURRENT_TOKEN=""

pass() {
  local name="$1"
  PASS_COUNT=$((PASS_COUNT + 1))
  printf 'PASS %s\n' "${name}"
}

fail() {
  local name="$1"
  local details="${2:-}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  if [[ -n "${details}" ]]; then
    printf 'FAIL %s :: %s\n' "${name}" "${details}"
  else
    printf 'FAIL %s\n' "${name}"
  fi
}

run_http() {
  local method="$1"
  local path="$2"
  local body="$3"
  shift 3

  local tmp_body
  tmp_body="$(mktemp)"

  if [[ -n "${body}" ]]; then
    HTTP_CODE="$(curl -sS --max-time 30 -o "${tmp_body}" -w '%{http_code}' -X "${method}" "${BASE_URL}${path}" "$@" --data "${body}")"
  else
    HTTP_CODE="$(curl -sS --max-time 30 -o "${tmp_body}" -w '%{http_code}' -X "${method}" "${BASE_URL}${path}" "$@")"
  fi
  HTTP_BODY="$(cat "${tmp_body}")"
  rm -f "${tmp_body}"
}

assert_code() {
  local test_name="$1"
  local expected="$2"
  if [[ "${HTTP_CODE}" == "${expected}" ]]; then
    pass "${test_name}"
  else
    fail "${test_name}" "expected=${expected} got=${HTTP_CODE} body=${HTTP_BODY:0:220}"
  fi
}

assert_contains() {
  local test_name="$1"
  local pattern="$2"
  if printf '%s' "${HTTP_BODY}" | rg -qi "${pattern}"; then
    pass "${test_name}"
  else
    fail "${test_name}" "pattern=${pattern} body=${HTTP_BODY:0:220}"
  fi
}

new_test_identity() {
  local nonce
  nonce="$(date +%s)$RANDOM"
  TEST_EMAIL="codex.uat.${nonce}@example.com"
  TEST_USER="codex_uat_${nonce}"
  TEST_PASS="CodexUAT#2026"
}

create_and_login_user() {
  new_test_identity
  local register_payload login_payload
  register_payload="$(printf '{"email":"%s","username":"%s","password":"%s"}' "${TEST_EMAIL}" "${TEST_USER}" "${TEST_PASS}")"
  login_payload="$(printf '{"email":"%s","password":"%s"}' "${TEST_EMAIL}" "${TEST_PASS}")"

  run_http "POST" "/auth/register" "${register_payload}" \
    -H 'Content-Type: application/json' \
    -H "x-api-key: ${API_KEY}"
  if [[ "${HTTP_CODE}" == "200" ]] && printf '%s' "${HTTP_BODY}" | jq -e '.status == "success"' >/dev/null 2>&1; then
    pass "auth.register.success"
  else
    fail "auth.register.success" "code=${HTTP_CODE} body=${HTTP_BODY:0:220}"
    return 1
  fi

  run_http "POST" "/auth/login" "${login_payload}" \
    -H 'Content-Type: application/json' \
    -H "x-api-key: ${API_KEY}"
  if [[ "${HTTP_CODE}" == "200" ]] && printf '%s' "${HTTP_BODY}" | jq -e '.status == "success"' >/dev/null 2>&1; then
    CURRENT_USER_ID="$(printf '%s' "${HTTP_BODY}" | jq -r '.data.userId // empty')"
    CURRENT_TOKEN="$(printf '%s' "${HTTP_BODY}" | jq -r '.data.authToken // empty')"
    if [[ -n "${CURRENT_USER_ID}" && -n "${CURRENT_TOKEN}" ]]; then
      pass "auth.login.success"
      pass "auth.login.token_issued"
      return 0
    fi
  fi
  fail "auth.login.success" "code=${HTTP_CODE} body=${HTTP_BODY:0:220}"
  return 1
}

check_logs_for_runtime_errors() {
  local group="$1"
  local test_name="$2"
  local msgs
  msgs="$(AWS_PROFILE="${AWS_PROFILE}" AWS_REGION="${AWS_REGION}" \
    aws logs filter-log-events \
      --log-group-name "${group}" \
      --start-time "${START_MS}" \
      --limit 300 \
      --query 'events[].message' \
      --output text 2>/dev/null || true)"

  if [[ -z "${msgs}" ]]; then
    pass "${test_name}"
    return
  fi

  if printf '%s\n' "${msgs}" | rg -qi 'Task timed out|Process exited before completing|Runtime\.ExitError|UnhandledPromiseRejection|OutOfMemory|Lambda\.Unknown'; then
    fail "${test_name}" "runtime error pattern found in ${group}"
  else
    pass "${test_name}"
  fi
}

check_stepfunctions_recent() {
  local region="$1"
  local hours="$2"
  local test_name="$3"
  local since
  since="$(python3 - <<PY
from datetime import datetime, timezone, timedelta
print((datetime.now(timezone.utc)-timedelta(hours=${hours})).strftime('%Y-%m-%dT%H:%M:%SZ'))
PY
)"

  local failures=0
  local executions=0
  while IFS= read -r arn; do
    [[ -z "${arn}" ]] && continue
    local out
    out="$(AWS_PROFILE="${AWS_PROFILE}" AWS_REGION="${region}" \
      aws stepfunctions list-executions \
        --state-machine-arn "${arn}" \
        --max-results 50 \
        --query 'executions[].[status,startDate,name]' \
        --output text 2>/dev/null || true)"
    [[ -z "${out}" ]] && continue
    while IFS=$'\t' read -r status start name; do
      [[ -z "${status}" || -z "${start}" ]] && continue
      [[ "${start}" < "${since}" ]] && continue
      executions=$((executions + 1))
      if [[ "${status}" != "SUCCEEDED" && "${status}" != "RUNNING" ]]; then
        failures=$((failures + 1))
        printf 'STEPFN_FAIL region=%s status=%s start=%s arn=%s name=%s\n' "${region}" "${status}" "${start}" "${arn}" "${name}"
      fi
    done <<< "${out}"
  done < <(
    AWS_PROFILE="${AWS_PROFILE}" AWS_REGION="${region}" \
      aws stepfunctions list-state-machines \
        --query 'stateMachines[].stateMachineArn' \
        --output text 2>/dev/null | tr '\t' '\n'
  )

  if [[ "${failures}" -eq 0 ]]; then
    pass "${test_name}"
    printf 'INFO stepfunctions region=%s recent_executions=%d failures=%d\n' "${region}" "${executions}" "${failures}"
  else
    fail "${test_name}" "region=${region} recent_executions=${executions} failures=${failures}"
  fi
}

run_load_test() {
  local path="$1"
  local expected="$2"
  local total="$3"
  local concurrency="$4"
  local timeout_s="$5"
  local p95_max="$6"
  local test_prefix="$7"

  local url out
  url="${BASE_URL}${path}"
  out="$(mktemp)"

  seq "${total}" | xargs -P "${concurrency}" -I{} sh -c \
    "curl -sS --max-time ${timeout_s} -o /dev/null -w '%{http_code} %{time_total}\n' '${url}'" \
    > "${out}"

  local success
  success="$(awk -v expected="${expected}" '$1==expected{c++} END{print c+0}' "${out}")"
  local fail_n
  fail_n=$((total - success))
  local p95
  p95="$(python3 - <<'PY' "${out}"
import sys
vals = []
with open(sys.argv[1], 'r', encoding='utf-8', errors='ignore') as fh:
    for line in fh:
        parts = line.split()
        if len(parts) == 2:
            try:
                vals.append(float(parts[1]))
            except Exception:
                pass
vals.sort()
if not vals:
    print('999')
else:
    idx = int((len(vals) - 1) * 0.95)
    print(f'{vals[idx]:.3f}')
PY
)"
  rm -f "${out}"

  if [[ "${fail_n}" -eq 0 ]] && awk "BEGIN{exit !(${p95} <= ${p95_max})}"; then
    pass "${test_prefix}"
    printf 'INFO %s total=%d success=%d fail=%d p95=%ss threshold=%ss\n' "${test_prefix}" "${total}" "${success}" "${fail_n}" "${p95}" "${p95_max}"
  else
    fail "${test_prefix}" "total=${total} success=${success} fail=${fail_n} p95=${p95}s threshold=${p95_max}s"
  fi
}

option_a() {
  printf '\n=== OPTION A: API-only automated UAT ===\n'

  if BASE_URL="${BASE_URL}" "${SMOKE_SCRIPT}"; then
    pass "A.smoke.baseline"
  else
    fail "A.smoke.baseline"
  fi

  new_test_identity
  local no_key_payload
  no_key_payload="$(printf '{"email":"%s","username":"%s","password":"%s"}' "${TEST_EMAIL}" "${TEST_USER}" "${TEST_PASS}")"
  run_http "POST" "/auth/register" "${no_key_payload}" -H 'Content-Type: application/json'
  if [[ "${HTTP_CODE}" != "200" ]] && printf '%s' "${HTTP_BODY}" | rg -q 'app_not_found|Application not found'; then
    pass "A.auth.no_apikey_rejected"
  else
    fail "A.auth.no_apikey_rejected" "code=${HTTP_CODE} body=${HTTP_BODY:0:220}"
  fi

  create_and_login_user

  run_http "GET" "/users/${CURRENT_USER_ID}/apps" "" -H "x-api-key: ${API_KEY}"
  assert_code "A.auth.protected_requires_token" "401"

  run_http "GET" "/users/${CURRENT_USER_ID}/apps" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer invalidtoken"
  assert_code "A.auth.invalid_token_denied" "403"

  run_http "GET" "/users/${CURRENT_USER_ID}/apps" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "A.auth.valid_token_access" "200"

  run_http "GET" "/users/${CURRENT_USER_ID}" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "A.users.get_user" "200"

  local ugc_post_payload ugc_patch_payload ugc_id
  ugc_post_payload='{"type":"comment","data":"Codex UAT comment"}'
  run_http "POST" "/userGeneratedContents" "${ugc_post_payload}" \
    -H 'Content-Type: application/json' \
    -H "x-api-key: ${API_KEY}" \
    -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "A.ugc.post" "200"
  ugc_id="$(printf '%s' "${HTTP_BODY}" | jq -r '._id // empty')"
  if [[ -n "${ugc_id}" ]]; then
    pass "A.ugc.id_generated"
  else
    fail "A.ugc.id_generated" "body=${HTTP_BODY:0:220}"
  fi

  run_http "GET" "/userGeneratedContents/${ugc_id}" "" -H "x-api-key: ${API_KEY}"
  assert_code "A.ugc.get" "200"
  assert_contains "A.ugc.get_contains_id" "${ugc_id}"

  ugc_patch_payload='{"data":"Codex UAT comment edited"}'
  run_http "PATCH" "/userGeneratedContents/${ugc_id}" "${ugc_patch_payload}" \
    -H 'Content-Type: application/json' \
    -H "x-api-key: ${API_KEY}" \
    -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "A.ugc.patch" "200"
  assert_contains "A.ugc.patch_updated_data" "edited"

  run_http "DELETE" "/userGeneratedContents/${ugc_id}" "" \
    -H "x-api-key: ${API_KEY}" \
    -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "A.ugc.delete" "200"

  run_http "GET" "/userGeneratedContents/${ugc_id}" "" -H "x-api-key: ${API_KEY}"
  assert_code "A.ugc.get_after_delete" "200"
  assert_contains "A.ugc.get_after_delete_empty" '^\[\]$'

  run_http "POST" "/auth/logout" '{}' \
    -H 'Content-Type: application/json' \
    -H "x-api-key: ${API_KEY}" \
    -H "X-Auth-Token: ${CURRENT_TOKEN}" \
    -H "X-User-Id: ${CURRENT_USER_ID}"
  assert_code "A.auth.logout" "200"

  run_http "GET" "/users/${CURRENT_USER_ID}/apps" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "A.auth.token_revoked_after_logout" "403"
}

option_b() {
  printf '\n=== OPTION B: Hybrid UAT (API + business/async checks) ===\n'

  create_and_login_user

  run_http "GET" "/providers/CPME/websitePage?path=%2Fannuaire%2Finstitutions" "" -H "x-api-key: ${API_KEY}"
  assert_code "B.business.provider_websitepage" "200"

  run_http "GET" "/press/articles" "" -H "x-api-key: ${API_KEY}"
  assert_code "B.business.press_articles_list" "200"
  if printf '%s' "${HTTP_BODY}" | jq -e '.total >= 0' >/dev/null 2>&1; then
    pass "B.business.press_articles_shape"
  else
    fail "B.business.press_articles_shape" "body=${HTTP_BODY:0:220}"
  fi

  run_http "GET" "/users/${CURRENT_USER_ID}" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "B.auth.user_self_get" "200"

  run_http "GET" "/users/${CURRENT_USER_ID}/apps" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "B.auth.user_apps_get" "200"

  run_http "GET" "/users/${CURRENT_USER_ID}/apps/previews" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "B.auth.user_apps_previews_get" "200"

  local metric_payload metric_id
  metric_payload='{"contentCollection":"pressArticles","contentId":"uat-option-b","type":"time","data":{"startTime":"2026-03-01T18:00:00.000Z","endTime":"2026-03-01T18:01:00.000Z"}}'
  run_http "POST" "/userMetrics" "${metric_payload}" \
    -H 'Content-Type: application/json' \
    -H "x-api-key: ${API_KEY}" \
    -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "B.metrics.post" "200"
  metric_id="$(printf '%s' "${HTTP_BODY}" | jq -r '._id // empty')"
  if [[ -n "${metric_id}" ]]; then
    pass "B.metrics.id_generated"
  else
    fail "B.metrics.id_generated" "body=${HTTP_BODY:0:220}"
  fi

  run_http "GET" "/userMetrics/${metric_id}" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "B.metrics.get_by_id" "200"
  assert_contains "B.metrics.get_contains_id" "${metric_id}"

  run_http "GET" "/userMetrics?contentCollection=pressArticles&contentId=uat-option-b&limit=5" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "B.metrics.get_all_filtered" "200"

  check_logs_for_runtime_errors "/aws/lambda/auth-prod-register" "B.async.logs.auth_register"
  check_logs_for_runtime_errors "/aws/lambda/auth-prod-login" "B.async.logs.auth_login"
  check_logs_for_runtime_errors "/aws/lambda/auth-prod-logout" "B.async.logs.auth_logout"
  check_logs_for_runtime_errors "/aws/lambda/userGeneratedContents-prod-postUGC" "B.async.logs.ugc_post"
  check_logs_for_runtime_errors "/aws/lambda/userGeneratedContents-prod-patchUGC" "B.async.logs.ugc_patch"
  check_logs_for_runtime_errors "/aws/lambda/userGeneratedContents-prod-removeUGC" "B.async.logs.ugc_remove"
  check_logs_for_runtime_errors "/aws/lambda/userMetrics-prod-postUserMetrics" "B.async.logs.metrics_post"
  check_logs_for_runtime_errors "/aws/lambda/userMetrics-prod-getUserMetrics" "B.async.logs.metrics_get"

  check_stepfunctions_recent "${AWS_REGION}" 24 "B.async.stepfunctions_region_primary"
  check_stepfunctions_recent "us-east-1" 24 "B.async.stepfunctions_region_use1"
}

option_c() {
  printf '\n=== OPTION C: Dress rehearsal (load/resilience/rollback readiness) ===\n'

  run_load_test "/" 200 20 4 15 12 "C.load.root"
  run_load_test "/press/articles" 200 20 4 15 12 "C.load.press_articles"
  run_load_test "/userGeneratedContents" 200 20 4 15 12 "C.load.ugc_list"
  run_load_test "/files/formats" 200 20 4 15 12 "C.load.files_formats"

  if BASE_URL="${BASE_URL}" "${SMOKE_SCRIPT}"; then
    pass "C.resilience.post_load_smoke"
  else
    fail "C.resilience.post_load_smoke"
  fi

  create_and_login_user
  run_http "GET" "/users/${CURRENT_USER_ID}/apps" "" -H "x-api-key: ${API_KEY}" -H "Authorization: Bearer ${CURRENT_TOKEN}"
  assert_code "C.resilience.auth_still_operational" "200"

  run_http "POST" "/auth/logout" '{}' \
    -H 'Content-Type: application/json' \
    -H "x-api-key: ${API_KEY}" \
    -H "X-Auth-Token: ${CURRENT_TOKEN}" \
    -H "X-User-Id: ${CURRENT_USER_ID}"
  assert_code "C.resilience.logout_after_load" "200"

  local prev_commit remote_head
  prev_commit="$(git rev-parse --short HEAD~1 2>/dev/null || true)"
  remote_head="$(git ls-remote --heads origin main | awk '{print substr($1,1,8)}')"
  if [[ -n "${prev_commit}" ]]; then
    pass "C.rollback.prev_commit_exists"
  else
    fail "C.rollback.prev_commit_exists"
  fi
  if [[ -n "${remote_head}" ]]; then
    pass "C.rollback.remote_main_visible"
  else
    fail "C.rollback.remote_main_visible"
  fi
}

final_green_gates() {
  printf '\n=== FINAL GREEN GATES ===\n'

  local hardcoded
  hardcoded="$(( $( (rg -n '630176884077' --glob '*/serverless.js' || true) | wc -l ) ))"
  if [[ "${hardcoded}" == "0" ]]; then
    pass "GATE.source_arn_zero"
  else
    fail "GATE.source_arn_zero" "count=${hardcoded}"
  fi

  local rec_file
  rec_file="$(mktemp)"
  AWS_PROFILE="${AWS_PROFILE}" AWS_REGION="${AWS_REGION}" bash -c '
set -euo pipefail
missing=0
not_green=0
while IFS= read -r module; do
  [[ -z "$module" ]] && continue
  stack="${module}-prod"
  status=$(aws cloudformation describe-stacks --stack-name "$stack" --query "Stacks[0].StackStatus" --output text 2>/dev/null || true)
  if [[ -z "$status" || "$status" == "None" ]]; then
    missing=$((missing+1))
    continue
  fi
  case "$status" in
    CREATE_COMPLETE|UPDATE_COMPLETE) ;;
    *) not_green=$((not_green+1)) ;;
  esac
done < <(sed "/^$/d" deployOrderList)
printf "missing=%d not_green=%d\n" "$missing" "$not_green"
' > "${rec_file}"
  local rec_line
  rec_line="$(cat "${rec_file}")"
  rm -f "${rec_file}"
  if printf '%s' "${rec_line}" | rg -q 'missing=0 not_green=0'; then
    pass "GATE.stack_reconcile_green"
  else
    fail "GATE.stack_reconcile_green" "${rec_line}"
  fi
}

printf 'UAT ABC start_ts=%s\n' "${TS}"
printf 'base_url=%s aws_profile=%s aws_region=%s\n' "${BASE_URL}" "${AWS_PROFILE}" "${AWS_REGION}"

option_a
option_b
option_c
final_green_gates

printf '\nSUMMARY pass=%d fail=%d report=%s\n' "${PASS_COUNT}" "${FAIL_COUNT}" "${REPORT_FILE}"
if [[ "${FAIL_COUNT}" -gt 0 ]]; then
  exit 1
fi
