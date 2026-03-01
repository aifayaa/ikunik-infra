#!/usr/bin/env bash

set -euo pipefail

# Smoke-test key public/protected endpoints on the cloned production backend.
# Usage:
#   ./smoke_prod_clone.sh
#   BASE_URL="https://<api-id>.execute-api.eu-west-3.amazonaws.com/prod" ./smoke_prod_clone.sh

BASE_URL="${BASE_URL:-https://ooeq303hg5.execute-api.eu-west-3.amazonaws.com/prod}"

check_endpoint() {
  local path="$1"
  local expected="$2"
  local url="${BASE_URL}${path}"
  local code
  code="$(curl -s -o /tmp/smoke_prod_clone_body -w '%{http_code}' "$url")"
  if [[ "$code" != "$expected" ]]; then
    echo "FAIL path=${path} expected=${expected} got=${code}"
    return 1
  fi
  echo "PASS path=${path} status=${code}"
}

echo "smoke_base_url=${BASE_URL}"

failures=0
tests=(
  "/ 200"
  "/press/articles 200"
  "/userGeneratedContents 200"
  "/files/formats 200"
  "/appLiveStreams 200"
  "/providers/CPME/websitePage?path=%2Fannuaire%2Finstitutions 200"
  "/chat/self/session 401"
  "/users/me 401"
)

for test_case in "${tests[@]}"; do
  path="${test_case% *}"
  expected="${test_case##* }"
  if ! check_endpoint "${path}" "${expected}"; then
    failures=$((failures + 1))
  fi
done

if [[ "${failures}" -gt 0 ]]; then
  echo "smoke_result=FAILED failures=${failures}"
  exit 1
fi

echo "smoke_result=PASSED failures=0"
