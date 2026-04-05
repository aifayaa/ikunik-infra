#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  validate_app_api_contract.sh --env-file <path> [--api-key <value>] [--auth-token <token>] [--timeout <seconds>]

Description:
  Replays the same header behavior as the app:
  - guest mode: X-Api-Key only
  - logged mode: X-Api-Key + Authorization: Bearer <token> (if provided)

  The script checks key endpoints used at startup and tab permission gating.
USAGE
}

ENV_FILE=""
API_KEY_OVERRIDE=""
AUTH_TOKEN=""
TIMEOUT_SECONDS="20"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --auth-token)
      AUTH_TOKEN="${2:-}"
      shift 2
      ;;
    --api-key)
      API_KEY_OVERRIDE="${2:-}"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECONDS="${2:-20}"
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

if [[ -z "$ENV_FILE" || ! -f "$ENV_FILE" ]]; then
  echo "Missing or invalid --env-file: $ENV_FILE" >&2
  usage
  exit 1
fi

extract_env_value() {
  local key="$1"
  local file="$2"
  local raw
  raw="$(rg -n "^${key}=" "$file" -m1 | cut -d: -f2- || true)"
  echo "${raw#*=}"
}

API_URL="$(extract_env_value "REACT_APP_API_URL" "$ENV_FILE")"
API_KEY="$(extract_env_value "REACT_APP_API_KEY" "$ENV_FILE")"

if [[ -n "$API_KEY_OVERRIDE" ]]; then
  API_KEY="$API_KEY_OVERRIDE"
fi

if [[ -z "$API_URL" || -z "$API_KEY" ]]; then
  echo "Missing REACT_APP_API_URL or REACT_APP_API_KEY in $ENV_FILE" >&2
  exit 1
fi

declare -a CORE_ENDPOINTS=(
  "/apps/settings"
  "/apps/perms"
  "/press/categories"
)

failures=0

do_request() {
  local label="$1"
  local endpoint="$2"
  local include_api_key="$3"
  local bearer_token="$4"
  local enforce_success="${5:-true}"

  local tmp_body tmp_headers
  tmp_body="$(mktemp)"
  tmp_headers="$(mktemp)"

  local -a curl_args
  curl_args=(
    -sS
    -D "$tmp_headers"
    -o "$tmp_body"
    --max-time "$TIMEOUT_SECONDS"
    "$API_URL$endpoint"
  )

  if [[ "$include_api_key" == "true" ]]; then
    curl_args=(-H "x-api-key: $API_KEY" "${curl_args[@]}")
  fi
  if [[ -n "$bearer_token" ]]; then
    curl_args=(-H "Authorization: Bearer $bearer_token" "${curl_args[@]}")
  fi

  local status
  status="$(curl "${curl_args[@]}" -w "%{http_code}")"
  local first_line
  first_line="$(head -n 1 "$tmp_headers" | tr -d '\r')"
  local body_preview
  body_preview="$(tr '\n' ' ' <"$tmp_body" | cut -c1-220)"

  echo "[$label] $endpoint -> $status | $first_line"
  echo "  body: $body_preview"

  rm -f "$tmp_body" "$tmp_headers"

  if [[ "$enforce_success" == "true" && ! "$status" =~ ^2 ]]; then
    failures=$((failures + 1))
  fi
}

echo "Contract check target: $API_URL"
echo "Env file: $ENV_FILE"
echo

echo "=== Guest mode (same as app before login) ==="
for endpoint in "${CORE_ENDPOINTS[@]}"; do
  do_request "guest" "$endpoint" "true" "" "true"
done
echo

if [[ -n "$AUTH_TOKEN" ]]; then
  echo "=== Logged mode (same as app after login) ==="
  for endpoint in "${CORE_ENDPOINTS[@]}"; do
    do_request "logged" "$endpoint" "true" "$AUTH_TOKEN" "true"
  done
  echo
fi

echo "=== Diagnostics (no api key) ==="
for endpoint in "${CORE_ENDPOINTS[@]}"; do
  do_request "no-key" "$endpoint" "false" "" "false"
done
echo

if [[ "$failures" -gt 0 ]]; then
  echo "Contract check FAILED ($failures non-2xx responses in required app paths)." >&2
  exit 1
fi

echo "Contract check PASSED."
