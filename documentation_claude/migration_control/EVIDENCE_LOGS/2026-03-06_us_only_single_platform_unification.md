# Evidence Log - US-only single-platform unification

Date: 2026-03-06
Owner: codex
Target: `target-prod-us-unified-001`

## Objective
Promote Ikunik to one active US-only platform profile and remove active FR/eu-west-3 defaults from app, dashboard, control-plane docs, and runtime scripts.

## Code/config updates executed
1. `ikunik-app`
- `.env.prod.us` and `.env.prod.fr` now point to:
  - `REACT_APP_API_URL=https://api.aws.crowdaa.com/v1`
  - `REACT_APP_SSR_URL=https://ssr.aws.crowdaa.com`
- `.gitlab-ci.yml` `IKUNIK_TARGET_API_BASE_URL` updated to US API.
- FR-only publish/preview jobs disabled (`pushProdFr`, `updatePreviewProdFr`, `updatePreviewPreprodFr` -> `when: never`).
- `bin/generate-preview.sh` now treats `https://api.aws.crowdaa.com/v1` as canonical allowed API URL.
- `preview/preview.env` switched to US API/SSR defaults.

2. `ikunik-dashboard`
- Runtime region model reduced to US-only active keys (`crowdaa-dev-us`, `crowdaa-us`).
- `prodAppSettings` forced to `defaultRegion: crowdaa-us` and `enabledRegions: ['crowdaa-us']`.
- `getRegionFromPath` now accepts only `dev-us` and `us`.
- `.gitlab-ci.yml` `IKUNIK_TARGET_API_BASE_URL` updated to US API.
- `serverless.yml` FR region map removed.
- README updated for US-only serverless region and canonical API override.

3. `ikunik-infra` control-plane/docs
- New active target profile created:
  - `TARGETS/target-prod-us-unified-001.yaml`
- `STATUS_BOARD.yaml` switched to `active_target: target-prod-us-unified-001`.
- Old FR target marked archived (`target-prod-fr-clone-001.yaml` has `status: archived`, `superseded_by`).
- New active inventory folder created:
  - `INVENTORY/target-prod-us-unified-001/*`
- Inventory README + archived marker added.
- US-only updates applied in:
  - `MIGRATION_CHARTER.md`
  - `WORKPLAN.md`
  - `README.md`
  - `STARTUP_PROMPTS.md`
  - `NEXT_CLIENT_REPLICATION_FRAMEWORK.md`
  - `DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md`
  - `DASHBOARD_DNS_CUTOVER_CHECKLIST.md`
  - `AWS_ACCOUNT_SETUP_NEXT_CLIENT_RUNBOOK.md`
  - `TARGETS/target-template-next-client.yaml`
  - `INVENTORY_TEMPLATES/resource_inventory_template.csv`
  - `INVENTORY_TEMPLATES/secrets_inventory_template.csv`
- Added ADR note + new ADR:
  - `DECISIONS.md` -> US-only single-platform decision superseding prior api6ko canonical endpoint.
- Runtime script defaults updated:
  - `smoke_prod_clone.sh` BASE_URL default -> `https://api.aws.crowdaa.com/v1`
  - `uat_options_abc.sh` BASE_URL default -> `https://api.aws.crowdaa.com/v1`
  - `uat_options_abc.sh` AWS region default -> `us-east-1`
- Added control check for active inventory folder in `scripts/check_control_plane_consistency.sh`.

## Validation results

### Control-plane consistency
Command:
```bash
cd documentation_claude/migration_control/scripts
./check_control_plane_consistency.sh
```
Result: `consistency_result=PASSED failures=0`

### Isolation checks
Command:
```bash
cd documentation_claude/migration_control/scripts
./check_isolation.sh
```
Result: passed for app/build-tools/dashboard remotes and canonical clean workspace.

### Dashboard type-check + prod build
Commands:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-dashboard
yarn ts:check
CROWDAA_TARGET_API_URL='https://api.aws.crowdaa.com/v1' yarn build:prod
```
Result: both passed.

### Dashboard runtime wiring smoke
Command:
```bash
cd documentation_claude/migration_control/scripts
DASHBOARD_URL='https://d1jmbvp87c05ud.cloudfront.net' \
API_BASE_URL='https://api.aws.crowdaa.com/v1' \
API_KEY='EXsbdBQLdQbtkNTtStgsA8KvLPRgtrpFXXHXb9DaDY' \
./smoke_dashboard_target.sh
```
Result: `smoke_result=PASSED`, bundle wiring `dashboard_api_wiring=ok`.

### API smoke
Command:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra
./smoke_prod_clone.sh
```
Result: `smoke_result=PASSED failures=0` on US canonical API.

### App contract check
Command:
```bash
cd documentation_claude/migration_control/scripts
./validate_app_api_contract.sh --env-file /Users/crowdaa/Desktop/gits/ikunik-app/.env.prod.us
```
Result: `Contract check PASSED`.

### Five-app content probe on canonical US API
Probe: `/press/articles/v2`, `/press/categories`, `/userGeneratedContents`
Result:
- canonical app API key (`EXsbd...`) returns non-empty content (articles/categories/ugc).
- raw UUID app identifiers used as `x-api-key` return empty lists for articles/categories and are not valid app API keys.

### UAT A/B/C
Command:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra
API_KEY='EXsbdBQLdQbtkNTtStgsA8KvLPRgtrpFXXHXb9DaDY' AWS_PROFILE=crowdaa AWS_REGION=us-east-1 ./uat_options_abc.sh
```
Result: not fully green in this run.
- `FAIL B.metrics.post` (`startSubscriptionDate.getTime is not a function`)
- `FAIL B.metrics.id_generated`
- `FAIL GATE.stack_reconcile_green` (`missing=56 not_green=0`)
- Summary: `pass=55 fail=3`

## Outcome
US-only active profile and runtime/config/doc unification are applied and validated for dashboard wiring, API smoke, and app contract behavior. Full UAT remains partially blocked by existing backend metrics + stack reconciliation issues unrelated to region drift.
