# 2026-03-12 - US endpoint pruning to unblock API Gateway quota

## Scope
- Account: `670296240767` (Ikunik target)
- Region: `us-east-1`
- Stage: `prod`
- API Gateway REST API: `ocxuvafsn8`

## Objective
Unblock pending US deployments by removing telemetry-unused endpoint surface (legacy US, 365d) from active target API.

## Input set
- Candidate unused paths in `ikunik-infra`: 83 paths (mapped from legacy US usage analysis).
- Impacted services: 26.

## Execution summary
1. Commented endpoint-bearing function/event blocks in impacted `*/serverless.js` files.
2. First deploy wave executed for 26 services.
3. Remediation:
   - Deleted rollback stacks and redeployed: `crowd-prod`, `pressAutomation-prod`.
   - Deleted fully-empty services (all endpoints disabled): `forms-prod`, `ticketing-prod`.
   - `perms-prod` was already absent.
   - Restored `press` endpoints (`/press`, `/admin/press`) to preserve `press` exported resource IDs consumed by dependent `press*` stacks.
4. Deployed previously blocked stacks:
   - `userBadges-prod` (after delete of rollback stack)
   - `userReactions-prod`

## Results
- Target disabled paths removed from API: `81 / 83`
- Intentionally kept: `/press`, `/admin/press` (dependency anchor)
- API Gateway counts after pruning:
  - resources: `232`
  - resource-method pairs: `436`
- Sample runtime checks (execute-api URL):
  - `GET /` -> `200`
  - `GET /press` -> `200`
  - `GET /admin/press` -> `200`
  - `GET /forms/register` -> `403`
  - `GET /bookables` -> `403`
  - `GET /users/123/perms` -> `403`
  - `GET /tickets` -> `403`

## Final stack status (impacted set)
- `UPDATE_COMPLETE` or `CREATE_COMPLETE`: advertisements, appLiveStreams, apps, appsFeaturePlans, appsTranslations, auth, blast, crowd, documents, forum, ghanty, invitations, media, organizations, press, pressArticles, pressAutomation, pressSearch, providers, termsOfServices, userGeneratedContents, users, websites.
- intentionally not present: `forms-prod`, `ticketing-prod`, `perms-prod`.

## Artifacts
- `/tmp/ikunik_prune_prod_deploy_results.tsv`
- `/tmp/ikunik_prune_final_stack_status.tsv`
- `/tmp/ikunik_us_prod_resources_after_prune.json`
- `/tmp/ikunik_zero_paths_still_present.txt`
