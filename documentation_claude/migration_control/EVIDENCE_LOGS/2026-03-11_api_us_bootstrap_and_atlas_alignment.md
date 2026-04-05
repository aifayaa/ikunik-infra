# Evidence Log - 2026-03-11 - API US bootstrap and Atlas US alignment

## Scope
- Active target: `target-prod-us-unified-001`
- Objective: bring up Ikunik API runtime in `us-east-1` and align deployed runtime DB to Atlas US cluster before any public-domain cutover.

## 1) Investigation summary (live state before action)
- Atlas target DB confirmed in AWS `us-east-1` (`cluster0.wsearw.mongodb.net`).
- Live API stacks existed only in `eu-west-3` (`api-v1-prod` id `ooeq303hg5`).
- No API CloudFormation stacks existed in `us-east-1`.
- Existing Ikunik API SSM path only existed for `eu-west-3`:
  - `/ikunik/prod/eu-west-3/api-v1/*`

## 2) SSM prep for US runtime
Actions:
- Seeded `/ikunik/prod/us-east-1/api-v1/*` SecureString parameters:
  - `app-api-key-default`, `auth-pass`, `smtp-login`, `smtp-password`, `sns-key-id`, `sns-secret`
- Set US Mongo parameter:
  - `/ikunik/prod/us-east-1/api-v1/mongo-url` -> Atlas US URI (`cluster0.wsearw.mongodb.net`)
- Seeded missing encryption key path:
  - `/crowdaa_microservices/prod/us-east-1/mongodb/encryption-key`

## 3) US deploy prerequisites fixed
- Created deployment bucket:
  - `ms-deployment-us-east-1-670296240767`
- Set API Gateway account CloudWatch role in us-east-1:
  - `arn:aws:iam::670296240767:role/APIGatewayCloudWatchLogsRole`
- Domain bootstrap blocker:
  - Missing ACM cert for `api.aws.crowdaa.com` in `us-east-1`.
  - Used bootstrap switch `SKIP_CUSTOM_DOMAIN=1` for dark-launch endpoint deployment.

## 4) Code bootstrap toggles introduced
- `api-v1/serverless.js`:
  - support `SKIP_CUSTOM_DOMAIN=1` to disable `serverless-domain-manager` and `customDomain` block for bootstrap.
- `files/serverless.js`:
  - support `SKIP_FILES_S3_HOOK=1` to skip existing S3 notification hook during bootstrap.

## 5) US deployments executed
Deployed in `prod/us-east-1`:
- `api-v1`, `account`, `admin`, `apps`, `organizations`, `auth`, `authorize`, `chat`, `files`, `providers`, `press`, `pressArticles`, `appLiveStreams`, `userGeneratedContents`, `users`, `blast`, `userMetrics`

Additional dependency creation:
- SNS topic `ugcVideoModerationCompletionTopicProdUs` in `us-east-1` (required by `userGeneratedContents`).
- SNS topic `blast-push-failure-prod-us` in `us-west-2` (required by `blast`).

US execute-api endpoint:
- `https://ocxuvafsn8.execute-api.us-east-1.amazonaws.com/prod`

## 6) Runtime verification
### Smoke (US endpoint)
Command:
```bash
BASE_URL='https://ocxuvafsn8.execute-api.us-east-1.amazonaws.com/prod' ./smoke_prod_clone.sh
```
Result:
- `smoke_result=PASSED failures=0`

### UAT ABC (US endpoint)
Command:
```bash
API_KEY=<from /ikunik/prod/us-east-1/api-v1/app-api-key-default> \
BASE_URL='https://ocxuvafsn8.execute-api.us-east-1.amazonaws.com/prod' \
./uat_options_abc.sh
```
Result:
- `pass=57 fail=1`
- only remaining fail:
  - `FAIL GATE.stack_reconcile_green :: missing=39 not_green=0`

### Dashboard validators against US API endpoint
Result:
- `smoke_dashboard_target.sh` failed with:
  - `dashboard_bundle_not_wired_to_target_api`
- `validate_dashboard_us_only_apps.sh` failed with:
  - `expected_api_not_found`

Interpretation:
- Dashboard bundle still points to historical API base URL; dashboard rebuild/deploy is required for US endpoint validation.

## 7) Datacenter alignment proof
Sample deployed Lambda config (`account-prod-authorize`, `us-east-1`):
- `REGION=us-east-1`
- `MONGO_URL` points to Atlas host `cluster0.wsearw.mongodb.net` (credentials redacted)

This confirms API runtime and Mongo target are aligned in US region for deployed US stacks.

## 8) Remaining gaps before production cutover
1. Deploy remaining `deployOrderList` modules in `us-east-1` (39 stacks still missing).
2. Rebuild/redeploy dashboard bundle wired to US API endpoint.
3. Complete custom-domain prerequisites in `us-east-1` (ACM + Route53/domain mapping) before moving public traffic.
4. Execute controlled traffic/domain cutover only after post-cutover smoke + dashboard US-only checks are green.
