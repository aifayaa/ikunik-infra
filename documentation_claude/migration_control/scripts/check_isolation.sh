#!/usr/bin/env bash
set -euo pipefail

APP_REPO="/Users/crowdaa/Desktop/gits/ikunik-app"
TOOLS_REPO="/Users/crowdaa/Desktop/gits/ikunik-build-tools"

check_repo() {
  local repo="$1"
  echo "=== $repo ==="
  git -C "$repo" remote -v

  local legacy_push
  legacy_push="$(git -C "$repo" remote get-url --push legacy 2>/dev/null || true)"
  local origin_push
  origin_push="$(git -C "$repo" remote get-url --push origin 2>/dev/null || true)"

  if [[ "$legacy_push" != "DISABLED_NO_PUSH" ]]; then
    echo "[FAIL] legacy push is not disabled in $repo"
    exit 1
  fi

  if [[ "$origin_push" == *"gitlab.aws.crowdaa.com"* ]]; then
    echo "[FAIL] origin push points to legacy gitlab in $repo"
    exit 1
  fi

  echo "[OK] remote policy valid for $repo"
}

check_repo "$APP_REPO"
check_repo "$TOOLS_REPO"

echo "Isolation checks passed."
