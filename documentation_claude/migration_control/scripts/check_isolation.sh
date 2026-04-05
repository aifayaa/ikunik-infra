#!/usr/bin/env bash
set -euo pipefail

APP_REPO="/Users/crowdaa/Desktop/gits/ikunik-app"
TOOLS_REPO="/Users/crowdaa/Desktop/gits/ikunik-build-tools"
DASHBOARD_REPO="/Users/crowdaa/Desktop/gits/ikunik-dashboard"
CANONICAL_RELEASE_APP_REPO="/Users/crowdaa/Desktop/gits/ikunik-app-target-clean"
CANONICAL_RELEASE_BRANCH="staging/target-infra-build-ready"

check_repo() {
  local repo="$1"
  local expected_push_default="$2"
  echo "=== $repo ==="
  git -C "$repo" remote -v

  local legacy_push
  legacy_push="$(git -C "$repo" remote get-url --push legacy 2>/dev/null || true)"
  local origin_push
  origin_push="$(git -C "$repo" remote get-url --push origin 2>/dev/null || true)"

  if [[ -n "$legacy_push" && "$legacy_push" != "DISABLED_NO_PUSH" ]]; then
    echo "[FAIL] legacy push is not disabled in $repo"
    exit 1
  fi

  if [[ "$origin_push" == *"gitlab.aws.crowdaa.com"* ]]; then
    echo "[FAIL] origin push points to legacy gitlab in $repo"
    exit 1
  fi

  local push_default
  push_default="$(git -C "$repo" config remote.pushDefault || true)"
  if [[ "$push_default" != "$expected_push_default" ]]; then
    echo "[FAIL] remote.pushDefault must be '$expected_push_default' in $repo (got '${push_default:-<unset>}')"
    exit 1
  fi

  local push_default_url
  push_default_url="$(git -C "$repo" remote get-url --push "$push_default" 2>/dev/null || true)"
  if [[ -z "$push_default_url" || "$push_default_url" == "DISABLED_NO_PUSH" ]]; then
    echo "[FAIL] push-default remote '$push_default' is not push-enabled in $repo"
    exit 1
  fi
  if [[ "$push_default_url" == *"gitlab.aws.crowdaa.com"* ]]; then
    echo "[FAIL] push-default remote '$push_default' points to legacy gitlab in $repo"
    exit 1
  fi

  local legacy_upstreams
  legacy_upstreams="$(git -C "$repo" for-each-ref --format='%(upstream:short)' refs/heads | rg '^legacy/' || true)"
  if [[ -n "$legacy_upstreams" ]]; then
    echo "[FAIL] branch upstream still tracks legacy remote in $repo:"
    echo "$legacy_upstreams"
    exit 1
  fi

  echo "[OK] remote policy valid for $repo"
}

check_repo "$APP_REPO" "github"
check_repo "$TOOLS_REPO" "github"
check_repo "$DASHBOARD_REPO" "origin"

echo "=== $CANONICAL_RELEASE_APP_REPO ==="
if [[ ! -d "$CANONICAL_RELEASE_APP_REPO/.git" ]]; then
  echo "[FAIL] canonical release app workspace is missing: $CANONICAL_RELEASE_APP_REPO"
  exit 1
fi

canonical_branch="$(git -C "$CANONICAL_RELEASE_APP_REPO" rev-parse --abbrev-ref HEAD)"
if [[ "$canonical_branch" != "$CANONICAL_RELEASE_BRANCH" ]]; then
  echo "[FAIL] canonical release workspace must be on $CANONICAL_RELEASE_BRANCH (got $canonical_branch)"
  exit 1
fi

canonical_head="$(git -C "$CANONICAL_RELEASE_APP_REPO" rev-parse HEAD)"
canonical_origin="$(git -C "$CANONICAL_RELEASE_APP_REPO" rev-parse "origin/$CANONICAL_RELEASE_BRANCH")"
if [[ "$canonical_head" != "$canonical_origin" ]]; then
  echo "[FAIL] canonical release workspace is not in parity with origin/$CANONICAL_RELEASE_BRANCH"
  exit 1
fi

if [[ -n "$(git -C "$CANONICAL_RELEASE_APP_REPO" status --porcelain)" ]]; then
  echo "[FAIL] canonical release workspace must be clean before release builds"
  exit 1
fi
echo "[OK] canonical release workspace is clean and in origin parity"

echo "Isolation checks passed."
