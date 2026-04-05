# Evidence Log - 2026-03-04 - Dashboard Deploy + Smoke on Target Temporary Domain

## Target
- `target-prod-fr-clone-001`

## Objective
Deploy dashboard on target infra temporary domain, wire it to target API, and run smoke tests.

## Preconditions Verified
- AWS identity for deploy account:
  - Account: `670296240767`
  - ARN: `arn:aws:sts::670296240767:assumed-role/InfraProvisionRole/...`
- Target API scope lock confirmed in target profile:
  - `stage=prod`
  - `region=eu-west-3`
  - `api_base_url=https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod`

## Dashboard Repo Changes (target lane)
- Added build-time API override support:
  - `CROWDAA_TARGET_API_URL`
  - `CROWDAA_TARGET_ROOT_APP_ID`
- Added deploy-time bucket override support:
  - `SERVERLESS_BUCKET_NAME`
- Files changed in dashboard repo:
  - `src/lib/appSettings/appRegionsSettings.ts`
  - `src/vite-env.d.ts`
  - `serverless.yml`
  - `README.md`

## Deploy Execution
### Build
- Command:
  - `CROWDAA_TARGET_API_URL=https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod yarn build:prod`
- Result: success

### Serverless deploy attempt
- Command:
  - `yarn ci:deploy` with target bucket override and target AWS profile.
- Result: blocked
- Blocker:
  - Serverless Framework v4 required interactive login/license on this machine (`serverless login`).

### Fallback deploy path (executed)
1. Created/configured S3 website bucket:
   - `ikunik-dashboard-target-prod-eu-west-3-670296240767`
2. Uploaded built assets (`dist/`) and cache headers.
3. Created CloudFront distribution in front of S3 website origin.

CloudFront output:
- Distribution ID: `ETZPOIB9BX2J5`
- Domain: `d1jmbvp87c05ud.cloudfront.net`
- Status reached: `Deployed`

Temporary dashboard URL:
- `https://d1jmbvp87c05ud.cloudfront.net`

## Smoke Validation
Executed script:
- `documentation_claude/migration_control/scripts/smoke_dashboard_target.sh`

Runtime parameters:
- `DASHBOARD_URL=https://d1jmbvp87c05ud.cloudfront.net`
- `API_BASE_URL=https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod`
- `API_KEY=nQ9ZO9DEgfaOzWY44Xu2J2uaPtP92t176PpBkdqu`

Result summary:
- `dashboard_root_status=200`
- `dashboard_api_wiring=ok` (main bundle contains target API URL)
- `login_probe_status=404` with expected payload `{"message":"user_not_found"}`
- Public API checks:
  - `/` => 200
  - `/press/articles` => 200
  - `/files/formats` => 200
  - `/appLiveStreams` => 200
- Final: `smoke_result=PASSED`

## Control-Plane Updates
- `TARGETS/target-prod-fr-clone-001.yaml` updated with:
  - `runtime_endpoints.dashboard_temp_url=https://d1jmbvp87c05ud.cloudfront.net`
  - `dashboard_deployment.bucket_name=ikunik-dashboard-target-prod-eu-west-3-670296240767`
  - `dashboard_deployment.cloudfront_distribution_id=ETZPOIB9BX2J5`
  - `dashboard_deployment.cloudfront_domain=d1jmbvp87c05ud.cloudfront.net`
- Added cutover checklist:
  - `DASHBOARD_DNS_CUTOVER_CHECKLIST.md`
- Added repeatable smoke script:
  - `scripts/smoke_dashboard_target.sh`
- Added dashboard inventory file:
  - `INVENTORY/target-prod-fr-clone-001/dashboard_inventory.csv`

## Exit Gate Status
- Dashboard temporary target deployment: ✅
- Dashboard connected to target API: ✅
- Smoke checks complete and green: ✅
- Final custom domain cutover: pending (separate gated step)
