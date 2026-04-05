#!/usr/bin/env bash
set -euo pipefail

DASHBOARD_URL="${DASHBOARD_URL:-}"
API_BASE_URL="${API_BASE_URL:-}"
API_KEY="${API_KEY:-}"
STRICT_US_ONLY="${STRICT_US_ONLY:-1}"

if [[ -z "${DASHBOARD_URL}" || -z "${API_BASE_URL}" || -z "${API_KEY}" ]]; then
  echo "Usage: DASHBOARD_URL=<https://...> API_BASE_URL=<https://...> API_KEY=<x-api-key> $0" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

ROOT_STATUS="$(curl -s -o "${TMP_DIR}/index.html" -w '%{http_code}' "${DASHBOARD_URL}/")"
ASSET_PATH="$(rg -o "assets/index-[A-Za-z0-9_-]+\\.js" "${TMP_DIR}/index.html" -m1 || true)"

if [[ -z "${ASSET_PATH}" ]]; then
  echo "dashboard_asset_lookup=failed" >&2
  exit 1
fi

curl -s "${DASHBOARD_URL}/${ASSET_PATH}" -o "${TMP_DIR}/main.js"

API_WIRING="missing"
if grep -Fq "${API_BASE_URL}" "${TMP_DIR}/main.js"; then
  API_WIRING="ok"
fi

US_ONLY_BUNDLE_CHECK="skipped"
if [[ "${STRICT_US_ONLY}" == "1" ]]; then
  FORBIDDEN_BUNDLE_PATTERNS=(
    "6koicomg10.execute-api.eu-west-3.amazonaws.com/prod"
    "api-fr.aws.crowdaa.com"
    "preprod-api.aws.crowdaa.com"
    "crowdaa-fr"
    "crowdaa-preprod-fr"
    "preprod-fr"
  )

  for pattern in "${FORBIDDEN_BUNDLE_PATTERNS[@]}"; do
    if grep -Fq "${pattern}" "${TMP_DIR}/main.js"; then
      echo "smoke_result=FAILED reason=forbidden_bundle_pattern pattern=${pattern}" >&2
      exit 1
    fi
  done

  if ! grep -Fq "crowdaa-us" "${TMP_DIR}/main.js"; then
    echo "smoke_result=FAILED reason=missing_crowdaa_us_marker" >&2
    exit 1
  fi

  US_ONLY_BUNDLE_CHECK="ok"
fi

LOGIN_STATUS="$(curl -s -o "${TMP_DIR}/login.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -H "x-api-key: ${API_KEY}" \
  -d '{"email":"smoke-test@example.invalid","password":"invalid"}' \
  "${API_BASE_URL}/auth/login")"

PUBLIC_PATHS=("/" "/press/articles" "/files/formats" "/appLiveStreams")
PUBLIC_FAIL=0
for path in "${PUBLIC_PATHS[@]}"; do
  CODE="$(curl -s -o "${TMP_DIR}/public.json" -w '%{http_code}' -H "x-api-key: ${API_KEY}" "${API_BASE_URL}${path}")"
  echo "api_path=${path} status=${CODE}"
  if [[ "${CODE}" != "200" ]]; then
    PUBLIC_FAIL=1
  fi
done

echo "dashboard_root_status=${ROOT_STATUS}"
echo "dashboard_asset_path=${ASSET_PATH}"
echo "dashboard_api_wiring=${API_WIRING}"
echo "us_only_bundle_check=${US_ONLY_BUNDLE_CHECK}"
echo "login_probe_status=${LOGIN_STATUS}"

if [[ "${ROOT_STATUS}" != "200" ]]; then
  echo "smoke_result=FAILED reason=dashboard_root_non_200" >&2
  exit 1
fi

if [[ "${API_WIRING}" != "ok" ]]; then
  echo "smoke_result=FAILED reason=dashboard_bundle_not_wired_to_target_api" >&2
  exit 1
fi

case "${LOGIN_STATUS}" in
  400|401|403|404) ;;
  *)
    echo "smoke_result=FAILED reason=unexpected_login_probe_status_${LOGIN_STATUS}" >&2
    exit 1
    ;;
esac

if [[ "${PUBLIC_FAIL}" -ne 0 ]]; then
  echo "smoke_result=FAILED reason=api_public_endpoint_failure" >&2
  exit 1
fi

echo "smoke_result=PASSED"
