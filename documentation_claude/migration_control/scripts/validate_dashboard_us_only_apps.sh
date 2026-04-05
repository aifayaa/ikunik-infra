#!/usr/bin/env bash
set -euo pipefail

DASHBOARD_URL="${DASHBOARD_URL:-}"
API_BASE_URL="${API_BASE_URL:-}"
API_KEY="${API_KEY:-}"
DASHBOARD_TEST_EMAIL="${DASHBOARD_TEST_EMAIL:-}"
DASHBOARD_TEST_PASSWORD="${DASHBOARD_TEST_PASSWORD:-}"

if [[ -z "${DASHBOARD_URL}" || -z "${API_BASE_URL}" || -z "${API_KEY}" ]]; then
  echo "Usage: DASHBOARD_URL=<https://...> API_BASE_URL=<https://...> API_KEY=<x-api-key> [DASHBOARD_TEST_EMAIL=... DASHBOARD_TEST_PASSWORD=...] $0" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

ROOT_STATUS="$(curl -s -o "${TMP_DIR}/index.html" -w '%{http_code}' "${DASHBOARD_URL}/us/apps")"
ASSET_PATH="$(rg -o "assets/index-[A-Za-z0-9_-]+\\.js" "${TMP_DIR}/index.html" -m1 || true)"

if [[ "${ROOT_STATUS}" != "200" ]]; then
  echo "US_ONLY_APPS_TEST=FAILED reason=dashboard_us_apps_non_200 status=${ROOT_STATUS}" >&2
  exit 1
fi

if [[ -z "${ASSET_PATH}" ]]; then
  echo "US_ONLY_APPS_TEST=FAILED reason=dashboard_asset_lookup_failed" >&2
  exit 1
fi

curl -s "${DASHBOARD_URL}/${ASSET_PATH}" -o "${TMP_DIR}/main.js"

if ! grep -Fq "${API_BASE_URL}" "${TMP_DIR}/main.js"; then
  echo "US_ONLY_APPS_TEST=FAILED reason=expected_api_not_found api=${API_BASE_URL}" >&2
  exit 1
fi

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
    echo "US_ONLY_APPS_TEST=FAILED reason=forbidden_bundle_pattern pattern=${pattern}" >&2
    exit 1
  fi
done

if ! grep -Fq "crowdaa-us" "${TMP_DIR}/main.js"; then
  echo "US_ONLY_APPS_TEST=FAILED reason=missing_crowdaa_us_marker" >&2
  exit 1
fi

MODE="bundle_only"
US_APPS_COUNT="unknown"

if [[ -n "${DASHBOARD_TEST_EMAIL}" && -n "${DASHBOARD_TEST_PASSWORD}" ]]; then
  MODE="authenticated"
  LOGIN_JSON="$(curl -s \
    -H 'content-type: application/json' \
    -H "x-api-key: ${API_KEY}" \
    -d "{\"email\":\"${DASHBOARD_TEST_EMAIL}\",\"password\":\"${DASHBOARD_TEST_PASSWORD}\"}" \
    "${API_BASE_URL}/auth/login")"

  AUTH_TOKEN="$(echo "${LOGIN_JSON}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log((j.data&&j.data.authToken)||"")}catch{console.log("")}})')"
  if [[ -z "${AUTH_TOKEN}" ]]; then
    echo "US_ONLY_APPS_TEST=FAILED reason=auth_login_failed" >&2
    exit 1
  fi

  APPS_JSON="$(curl -s \
    -H "x-api-key: ${API_KEY}" \
    -H "authorization: Bearer ${AUTH_TOKEN}" \
    "${API_BASE_URL}/apps")"

  APPS_STATUS="$(echo "${APPS_JSON}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const ok=j.status==="success"&&j.data&&Array.isArray(j.data.items);console.log(ok?"ok":"bad")}catch{console.log("bad")}})')"
  if [[ "${APPS_STATUS}" != "ok" ]]; then
    echo "US_ONLY_APPS_TEST=FAILED reason=apps_query_failed" >&2
    exit 1
  fi

  US_APPS_COUNT="$(echo "${APPS_JSON}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.data.items.length)}catch{console.log("unknown")}})')"
fi

echo "us_only_apps_test=PASSED"
echo "mode=${MODE}"
echo "dashboard_asset_path=${ASSET_PATH}"
echo "api_base_url=${API_BASE_URL}"
echo "us_apps_count=${US_APPS_COUNT}"
