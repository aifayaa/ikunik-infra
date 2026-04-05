# Evidence Log - 2026-03-08 - Dashboard US-only runtime fix and strict validation

## Scope
- Target: `target-prod-us-unified-001`
- Dashboard URL: `https://d1jmbvp87c05ud.cloudfront.net`
- Canonical API URL: `https://api.aws.crowdaa.com/v1`

## Objective
Fix runtime drift where dashboard `/us/...` could still serve a historical FR-targeted bundle, then validate strict US-only runtime behavior and update docs to prevent recurrence.

## 1) Pre-deploy live-state verification
Commands:
```bash
curl -sSL 'https://d1jmbvp87c05ud.cloudfront.net/us/apps' -o /tmp/index.html
```
Observed:
- Active bundle before fix was `assets/index-AJXs1Uc0.js`.
- Bundle contained historical FR markers and FR target API override:
  - `6koicomg10.execute-api.eu-west-3.amazonaws.com/prod`
  - `crowdaa-fr`, `crowdaa-preprod-fr`

## 2) Dashboard code/build hardening
Implemented in dashboard repo:
- US-only runtime guard script in CI:
  - `ci/check-us-only-bundle.sh`
- Region-safe app list cache key:
  - `src/lib/api/modules/Apps/hooks/useAppsQuery.ts` now scopes query key by current app region.
- CI deploy jobs now execute bundle guard after build and before deploy.

Validation:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-dashboard
yarn check:all
CROWDAA_TARGET_API_URL='https://api.aws.crowdaa.com/v1' yarn build:prod
EXPECTED_API_URL='https://api.aws.crowdaa.com/v1' ./ci/check-us-only-bundle.sh dist
```
Result:
- `check:all` passed
- build passed
- `US_ONLY_BUNDLE_CHECK=PASSED`

## 3) Deployment to live CloudFront origin
Target account check:
```bash
AWS_PROFILE=crowdaa aws sts get-caller-identity
```
Observed account:
- `670296240767` (expected)

Live distribution origin check:
```bash
AWS_PROFILE=crowdaa aws cloudfront get-distribution --id ETZPOIB9BX2J5
```
Observed origin domain:
- `ikunik-dashboard-target-prod-eu-west-3-670296240767.s3-website.eu-west-3.amazonaws.com`

Deployment commands:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-dashboard
AWS_PROFILE=crowdaa aws s3 sync dist s3://ikunik-dashboard-target-prod-eu-west-3-670296240767 --delete --exclude 'index.html' --cache-control 'public,max-age=31536000,immutable'
AWS_PROFILE=crowdaa aws s3 cp dist/index.html s3://ikunik-dashboard-target-prod-eu-west-3-670296240767/index.html --cache-control 'no-cache' --content-type 'text/html; charset=utf-8'
AWS_PROFILE=crowdaa aws cloudfront create-invalidation --distribution-id ETZPOIB9BX2J5 --paths '/*'
AWS_PROFILE=crowdaa aws cloudfront wait invalidation-completed --distribution-id ETZPOIB9BX2J5 --id IC3NOS86D4KDK35NXNHGXD3MN6
```
Result:
- Deploy and invalidation completed.

## 4) Post-deploy strict runtime validation
### 4.1 Strict smoke
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts
DASHBOARD_URL='https://d1jmbvp87c05ud.cloudfront.net' \
API_BASE_URL='https://api.aws.crowdaa.com/v1' \
API_KEY='nQ9ZO9DEgfaOzWY44Xu2J2uaPtP92t176PpBkdqu' \
STRICT_US_ONLY=1 \
./smoke_dashboard_target.sh
```
Result:
- `dashboard_asset_path=assets/index-Wl31vHuz.js`
- `dashboard_api_wiring=ok`
- `us_only_bundle_check=ok`
- `smoke_result=PASSED`

### 4.2 US-only apps validation script
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts
DASHBOARD_URL='https://d1jmbvp87c05ud.cloudfront.net' \
API_BASE_URL='https://api.aws.crowdaa.com/v1' \
API_KEY='nQ9ZO9DEgfaOzWY44Xu2J2uaPtP92t176PpBkdqu' \
./validate_dashboard_us_only_apps.sh
```
Result:
- `us_only_apps_test=PASSED`
- `mode=bundle_only`
- `dashboard_asset_path=assets/index-Wl31vHuz.js`

Note:
- Authenticated app-list fetch mode (`mode=authenticated`) is supported by the script when test credentials are provided via:
  - `DASHBOARD_TEST_EMAIL`
  - `DASHBOARD_TEST_PASSWORD`

## 5) Final bundle sanity check
Command:
```bash
curl -sSL 'https://d1jmbvp87c05ud.cloudfront.net/us/apps'
```
Observed in active bundle:
- present: `https://api.aws.crowdaa.com/v1`
- absent: `6koicomg10.execute-api.eu-west-3.amazonaws.com/prod`, `crowdaa-fr`, `crowdaa-preprod-fr`, `api-fr.aws.crowdaa.com`

## Outcome
- Live dashboard now serves US-only runtime bundle.
- Strict smoke and US-only dashboard validation scripts both pass.
- Runbooks/consistency docs were updated to require forbidden-token checks and to warn about CloudFront domain reuse drift.
