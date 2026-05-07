#!/usr/bin/env bash
set -euo pipefail

repo_kind="${1:-${IKUNIK_REPO_KIND:-infra}}"
expected_branch="${IKUNIK_EXPECTED_BRANCH:-}"

if [[ -n "$expected_branch" ]]; then
  if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
    actual_branch="${GITHUB_BASE_REF:-}"
  else
    actual_branch="${GITHUB_REF_NAME:-$(git branch --show-current)}"
  fi
  if [[ "$actual_branch" != "$expected_branch" ]]; then
    echo "FAIL Ikunik CI expected branch $expected_branch, got $actual_branch"
    exit 1
  fi
fi

deny_patterns=(
  '(^|[^[:alnum:]_-])api-fr\.aws\.crowdaa\.com'
  '(^|[^[:alnum:]_-])ssr-fr\.aws\.crowdaa\.com'
  '(^|[^[:alnum:]_-])api\.aws\.crowdaa\.com'
  '(^|[^[:alnum:]_-])api\.crowdaa\.com'
  '(^|[^[:alnum:]_-])app\.crowdaa\.com'
  'd1tmdgml10ct6o\.cloudfront\.net'
  'pdf-render\.crowdaa\.net'
  'crowdaa-fr'
  'crowdaa-pictures-prod-fr'
  'slsupload-prod-fr'
  'video-stream-prod-fr'
  'fr-apps-public-resources-prod'
  'crowdaa-apps-resources'
  'us-apps-public-resources-prod'
  'video-stream-prod\.crowdaa\.com'
  'crowdaa-pictures-prod([^[:alnum:]_-]|$)'
  'slsupload-prod([^[:alnum:]_-]|$)'
  'crowdaa-ci(-fr)?/ms/prod/in'
  'pushProdFr'
  'updatePreviewProdFr'
  'PROD_FR'
  'PREPROD_FR'
  'prod[[:space:]_-]*fr'
  'region=fr'
  '--region[=[:space:]]fr'
)

deny_regex="$(IFS='|'; echo "${deny_patterns[*]}")"

is_common_nonruntime_path() {
  local file="$1"

  [[ "$file" == ".github/scripts/ikunik-ci-guard.sh" ]] && return 0
  [[ "$file" == *.md ]] && return 0
  [[ "$file" == README* ]] && return 0
  [[ "$file" == docs/* ]] && return 0
  [[ "$file" == documentation_claude/* ]] && return 0
  [[ "$file" == swagger/* ]] && return 0
  [[ "$file" == */test/* || "$file" == */tests/* || "$file" == */fixtures/* ]] && return 0
  [[ "$file" == package-lock.json || "$file" == */package-lock.json ]] && return 0

  return 1
}

is_build_tools_nonrelease_path() {
  local file="$1"

  [[ "$file" == js/bin/migrations/* || "$file" == js/libs/migrations/* ]] && return 0
  [[ "$file" == js/bin/addShopToApp ]] && return 0

  return 1
}

is_allowed_build_tools_settings_match() {
  local file="$1"
  local line="$2"

  [[ "$file" == "js/settings.json" ]] || return 1
  [[ "$line" =~ \"S3_APPS_RESSOURCES\".*\"crowdaa-apps-resources\" ]] && return 0
  [[ "$line" =~ \"S3_APPS_PUBLIC_RESSOURCES\".*\"us-apps-public-resources-prod\" ]] && return 0
  [[ "$line" =~ \"S3_APPS_RESSOURCES\".*\"crowdaa-apps-resources-dev\" ]] && return 0

  return 1
}

is_infra_decommission_or_non_us_match() {
  local file="$1"
  local line="$2"

  [[ "$line" =~ preprod ]] && return 0
  [[ "$line" =~ prod-fr|PROD_FR|PREPROD_FR|prod/fr ]] && return 0
  [[ "$line" =~ eu-west-3 ]] && return 0
  [[ "$line" =~ api-fr\.aws\.crowdaa\.com|ssr-fr\.aws\.crowdaa\.com ]] && return 0
  [[ "$line" =~ crowdaa-apps-resources-prod-fr ]] && return 0
  [[ "$line" =~ StepFunctions-.*Fr|preprod-fr|prod-fr ]] && return 0
  [[ "$line" =~ S3_APPS_RESSOURCES.*crowdaa-apps-resources ]] && return 0
  [[ "$line" =~ S3_APPS_PUBLIC_RESSOURCES.*us-apps-public-resources-prod ]] && return 0
  [[ "$file" == "api-v1/serverless.js" && "$line" =~ api\.aws\.crowdaa\.com ]] && return 0
  [[ "$file" == "api-v1/serverless.js" && "$line" =~ app\.crowdaa\.com ]] && return 0
  [[ "$line" =~ app\.crowdaa\.com/dev-us ]] && return 0
  [[ "$line" =~ app\.crowdaa\.com/fr ]] && return 0

  return 1
}

is_allowed_match() {
  local file="$1"
  local line="$2"

  is_common_nonruntime_path "$file" && return 0

  if [[ "$repo_kind" == "build-tools" ]]; then
    is_build_tools_nonrelease_path "$file" && return 0
    is_allowed_build_tools_settings_match "$file" "$line" && return 0
  fi

  if [[ "$repo_kind" == "infra" ]]; then
    is_infra_decommission_or_non_us_match "$file" "$line" && return 0
  fi

  [[ "$line" =~ ikunik-legacy-allow ]] && return 0
  [[ "$line" =~ ^[[:space:]]*# ]] && return 0
  [[ "$line" =~ :[[:space:]]*# ]] && return 0
  [[ "$line" =~ Refusing[[:space:]]legacy ]] && return 0
  [[ "$line" =~ grep[[:space:]].*-[[:alnum:]]*E ]] && return 0
  [[ "$line" =~ intentionally[[:space:]]avoids? ]] && return 0

  return 1
}

matches="$(git grep -n -I -E "$deny_regex" -- . \
  ':(exclude)node_modules/**' \
  ':(exclude)dist/**' \
  ':(exclude)build/**' \
  ':(exclude)www/**' \
  ':(exclude)platforms/**' \
  ':(exclude)artifacts/**' || true)"

fail=0
while IFS=: read -r file _line_no line; do
  [[ -z "${file:-}" ]] && continue
  if ! is_allowed_match "$file" "$line"; then
    echo "FAIL legacy/FR runtime marker in $file"
    echo "$line"
    fail=1
  fi
done <<< "$matches"

if [[ "$fail" -ne 0 ]]; then
  echo "FAIL Ikunik legacy scan"
  exit 1
fi

echo "PASS Ikunik CI guard repo=$repo_kind branch=${actual_branch:-local}"
