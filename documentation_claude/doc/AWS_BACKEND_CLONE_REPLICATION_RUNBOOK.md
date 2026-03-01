# AWS Backend Clone Replication Runbook

Last updated: 2026-03-01

## Goal
Replicate the backend stack to a target AWS account and reach a "green" state where:
- all microservice stacks in `deployOrderList` are present,
- all are `CREATE_COMPLETE` or `UPDATE_COMPLETE`,
- key API smoke endpoints return expected HTTP responses,
- no hardcoded source account ID (`630176884077`) remains in `*/serverless.js`.

## Scope and assumptions
- Active stage/region for production clone: `prod` + `eu-west-3`.
- Source account historical ID: `630176884077`.
- Target account ID used in this migration lane: `670296240767`.
- Base repo: `/Users/crowdaa/Desktop/dev/crowdaa_microservices`.
- Orchestration/evidence workspace: `/Users/crowdaa/Desktop/backend_clone_handoff` (not a git repo).

## Required credentials and safety rules
1. Verify caller identity before any mutation:
```bash
AWS_PROFILE=crowdaa aws sts get-caller-identity
```
2. Keep source and target credentials isolated.
3. For deployments, always set:
```bash
AWS_PROFILE=crowdaa
AWS_SDK_LOAD_CONFIG=1
MS_DEPLOYMENT_BUCKET=ms-deployment-eu-west-3-670296240767
```

## Phase sequence

### Phase 1: Preflight
1. Check repo status and branch.
2. Verify API Gateway quota `L-01C8A9E0` (Resources/Routes per REST/WebSocket API).
3. If quota blocks deployment, request increase:
```bash
AWS_PROFILE=crowdaa AWS_REGION=eu-west-3 aws service-quotas request-service-quota-increase \
  --service-code apigateway \
  --quota-code L-01C8A9E0 \
  --desired-value 600
```

### Phase 2: Deploy wave
1. Deploy modules in `deployOrderList` order.
2. Use direct deploy per module when fixing blockers:
```bash
cd <module>
AWS_PROFILE=crowdaa AWS_SDK_LOAD_CONFIG=1 \
MS_DEPLOYMENT_BUCKET=ms-deployment-eu-west-3-670296240767 \
npx serverless deploy --stage prod --region eu-west-3
```
3. If a stack is `ROLLBACK_COMPLETE`, delete and redeploy.
4. If `files` fails on S3 custom resource, ensure target buckets exist and retry.

### Phase 3: Source-ARN hardening
1. Detect all hardcoded source account references:
```bash
cd /Users/crowdaa/Desktop/dev/crowdaa_microservices
rg -n "630176884077" --glob "*/serverless.js"
```
2. Replace with dynamic account usage via:
- `custom.awsAccountId: '${aws:accountId}'`
- `${self:custom.awsAccountId}` in ARNs.
3. Redeploy impacted modules in deploy-order.
4. Re-run detection until zero hits.

### Phase 4: Validation gates
1. Full stack reconciliation against `deployOrderList`.
2. Ensure no non-complete `-prod` stacks.
3. Smoke checks (examples):
```bash
REST='https://ooeq303hg5.execute-api.eu-west-3.amazonaws.com/prod'
curl -s -o /dev/null -w '%{http_code}\n' "$REST/"
curl -s -o /dev/null -w '%{http_code}\n' "$REST/press/articles"
curl -s -o /dev/null -w '%{http_code}\n' "$REST/userGeneratedContents"
curl -s -o /dev/null -w '%{http_code}\n' "$REST/files/formats"
curl -s -o /dev/null -w '%{http_code}\n' "$REST/appLiveStreams"
```
4. Confirm ARN hardening is complete:
```bash
rg -n "630176884077" --glob "*/serverless.js" || true
```

## Known high-risk areas
- `files`: S3 event custom resource, bucket ownership, MediaConvert roles.
- `pressArticles`: API Gateway resource count pressure.
- `liveStream`/`appLiveStreams`: IVS/StepFunctions/Lambda invoke ARNs.
- `blast`, `ghanty`, `userGeneratedContents`: workflow/state-machine/SNS references.

## Required deliverables for handoff
- Phase execution summary in `/Users/crowdaa/Desktop/backend_clone_handoff/logs/`.
- Updated matrix in `/Users/crowdaa/Desktop/backend_clone_handoff/inventory/derived/`.
- Git commit in `crowdaa_microservices` containing config/doc changes.

## Final readiness before deploying mobile apps
1. Async workflow E2E tests (notifications, streams, file processing).
2. Secret rotation/hardening with final production values.
3. Mongo data strategy execution (keep source Atlas temporarily or migrate).
4. API domain strategy for apps (gateway URL vs custom domain/DNS cutover).
5. UAT against new infra before app store deployment.
