# Session Evidence - Legacy DB Bridge + API 6ko Validation

Date: 2026-03-03
Operator: Codex

## Goal

Validate app `<05e8d798-57b8-413d-b1cc-d81866c01cf0>` against target infra API while temporarily keeping legacy Atlas data source.

## Key Findings

- Target API with current app URL (`ooeq303hg5`) returns empty content for this app.
- Current `api-v1:prod:RestApiId` export in this account is `6koicomg10`.
- Re-deploying app-facing services against legacy DB bridge on API `6koicomg10` restores content reads.

## Temporary Bridge Applied

- File change (local): `env.js`
  - `MONGO_URL` set to legacy Atlas cluster:
    - `mongodb+srv://...@crowdaa.vtd2k.mongodb.net/crowdaaDev?...`
- Services redeployed (`prod`, `eu-west-3`):
  - `account`
  - `apps`
  - `press`
  - `pressCategories`
  - `pressArticles`
  - `pressSearch`

## Validation Results

### Contract (app header behavior)

Using app env with:
- `REACT_APP_API_KEY=EXsbdB...`
- `REACT_APP_API_URL=https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod`

Result: `PASSED`
- `/apps/settings` -> 200
- `/apps/perms` -> 200
- `/press/categories` -> 200

### Content checks

- On `ooeq303hg5`:
  - categories: 0
  - articles: 0
- On `6koicomg10`:
  - categories: 10
  - articles total: 56
  - search returns results

### Smoke

`smoke_prod_clone.sh` with `BASE_URL=https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod`

Result: `PASSED` (all expected public/protected statuses).

## Build Track

- Local seed branch updated:
  - repo: `/Users/crowdaa/Desktop/gits/ikunik-app-buildseed`
  - commit: `99954d82`
  - change: `.env.prod.us` API URL switched to `https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod`
- Clean build workspace:
  - `/Users/crowdaa/Desktop/gits/ikunik-app-exec-20260303`
- Android build result:
  - `/Users/crowdaa/Desktop/gits/ikunik-app-exec-20260303/app-05e8d798-57b8-413d-b1cc-d81866c01cf0.aab`
  - `/Users/crowdaa/Desktop/gits/ikunik-app-exec-20260303/app-05e8d798-57b8-413d-b1cc-d81866c01cf0.apk`

## Notes / Risks

- GitHub remote `git@github.com:aifayaa/ikunik-app.git` was not accessible in this session (`Repository not found`), so the seed URL switch is currently local-state only.
- Bridge is temporary; when DB migration is complete, revert `env.js` `MONGO_URL` back to `${cf:api-v1-${self:provider.stage}.MongoURL}` and redeploy impacted services.
