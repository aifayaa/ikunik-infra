# 2026-03-12 - US runtime green closure + dashboard/build-tool alignment

## Account / scope
- AWS account: `670296240767`
- Stage/region: `prod/us-east-1`
- API Gateway ID: `ocxuvafsn8`

## Platform deploy state
- Deployed missing service: `notifications-prod` (`CREATE_COMPLETE`)
- Recreated previously blocked stacks and validated successful deploys:
  - `userBadges-prod` (`CREATE_COMPLETE`)
  - `userReactions-prod` (`CREATE_COMPLETE`)
- Final service stack summary from `ikunik-infra` directories:
  - Green (`CREATE_COMPLETE` or `UPDATE_COMPLETE`): `55`
  - Not present (intentional): `forms`, `perms`, `ticketing`

## Endpoint scope confirmation
- `ticketing` paths are absent from API resources.
- `/press` and `/admin/press` are present by design (dependency anchors for `press*` stacks).

## Runtime endpoint profile (active)
- API: `https://ocxuvafsn8.execute-api.us-east-1.amazonaws.com/prod`
- SSR: `https://89i8ygvpk7.execute-api.us-east-1.amazonaws.com/prod`

## Tooling alignment changes
1. `ikunik-dashboard`
   - `src/lib/appSettings/appRegionsSettings.ts`
     - `crowdaa-us.apiUrl` fallback set to active US execute-api endpoint.
   - `ci/check-us-only-bundle.sh`
     - default `EXPECTED_API_URL` set to active US execute-api endpoint.
   - `README.md`
     - target-lane API examples/default guard endpoint updated to active US execute-api endpoint.

2. `ikunik-build-tools`
   - `js/settings.json`
     - `prod.us.API_URL` set to active US execute-api endpoint.
     - `prod.us.MONGO_URL` set from SSM parameter `/ikunik/prod/us-east-1/api-v1/mongo-url`.

3. App env profiles
   - `ikunik-app-target-clean/.env.prod.us`
     - `REACT_APP_API_URL` and `REACT_APP_SSR_URL` set to active US endpoints.
   - `ikunik-app-buildseed/.env.prod.us`
     - same endpoint alignment to prevent build reset drift.

## Control-plane docs updated
- `TARGETS/target-prod-us-unified-001.yaml`
  - `runtime_endpoints.api_base_url` and `runtime_endpoints.ssr_base_host` switched to active US execute-api endpoints.
  - `database_runtime_mode` switched to active US Atlas parameter path.
- `DECISIONS.md`
  - Added ADR entry for quota-unblock endpoint pruning and US tooling alignment.

## Dashboard live US wiring execution (same day)
- Build command:
  - `CROWDAA_TARGET_API_URL=https://ocxuvafsn8.execute-api.us-east-1.amazonaws.com/prod corepack yarn build:prod`
- Bundle guard:
  - `EXPECTED_API_URL=https://ocxuvafsn8.execute-api.us-east-1.amazonaws.com/prod ./ci/check-us-only-bundle.sh dist` -> `PASSED`
- Publish target:
  - bucket: `ikunik-dashboard-target-prod-eu-west-3-670296240767`
  - cloudfront: `ETZPOIB9BX2J5`
  - invalidation id: `IVUVK948HLFY8CRIBY4QH4GW1`
- Live check:
  - dashboard URL: `https://d1jmbvp87c05ud.cloudfront.net/us/apps`
  - asset includes US API endpoint `https://ocxuvafsn8.execute-api.us-east-1.amazonaws.com/prod`
  - no EU execute-api marker detected.

## Final runtime status for manual validation handoff
- Active stack set is green with intentional removals (`forms`, `perms`, `ticketing`).
- Dashboard live bundle is US-wired.
- App env profiles (`ikunik-app`, `ikunik-app-target-clean`, `ikunik-app-buildseed`) are aligned to US API/SSR execute-api endpoints.

## Final green closure (after restoring forms/perms)
- `forms-prod` restored and deployed (`CREATE_COMPLETE`).
- `perms-prod` restored and deployed (`CREATE_COMPLETE`).
- Final stack summary from `ikunik-infra` services:
  - green: `57`
  - non-green: `1` (`ticketing-prod` intentionally `NOT_PRESENT`).
- API resource checks:
  - `/press` and `/admin/press` present.
  - ticketing paths absent.
  - total resource-method pairs: `454`.
