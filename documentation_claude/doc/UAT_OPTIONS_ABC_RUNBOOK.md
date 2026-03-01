# UAT Options A/B/C Runbook

Last updated: 2026-03-01

## Goal
Execute full backend UAT in three waves and reach a green state:
- Option A: API-only automated UAT.
- Option B: Hybrid UAT (business endpoints + async observability checks).
- Option C: Dress rehearsal (load, resilience, rollback-readiness checks).

## Prerequisites
1. Backend clone already deployed and stack reconciliation green.
2. API endpoint reachable (default currently):
   - `https://ooeq303hg5.execute-api.eu-west-3.amazonaws.com/prod`
3. API key for app context:
   - `API_KEY` env var required.
4. AWS access for observability:
   - `AWS_PROFILE` (default: `crowdaa`)
   - `AWS_REGION` (default: `eu-west-3`)

## Command
From repository root:

```bash
cd /Users/crowdaa/Desktop/dev/crowdaa_microservices
API_KEY='<app-api-key>' AWS_PROFILE=crowdaa AWS_REGION=eu-west-3 ./uat_options_abc.sh
```

## What the runner validates

### Option A
- Baseline smoke checks.
- Auth negative/positive flows (`register`, `login`, `logout`).
- Protected-route access control (`401` without token, `403` invalid token).
- Real CRUD lifecycle on `userGeneratedContents`.

### Option B
- Public business endpoints (`providers/CPME/websitePage`, `press/articles`).
- Authenticated user routes (`users/{id}`, apps listing).
- Real `userMetrics` create/read flow.
- CloudWatch runtime fault scan for tested lambdas.
- StepFunctions status scan in primary + `us-east-1` regions.

### Option C
- Parallel load probes on representative endpoints.
- Post-load smoke and auth resilience checks.
- Rollback-readiness dry checks (`HEAD~1` availability + remote main visibility).

### Final gates
- Source-account hardcoded ARN references in `*/serverless.js` are zero.
- CloudFormation reconciliation for all `deployOrderList` stacks:
  - `missing=0`
  - `not_green=0`

## Evidence output
Run logs are written to:
- `/Users/crowdaa/Desktop/backend_clone_handoff/logs/uat_options_abc_<timestamp>.log`

Runner exits `0` only when all checks pass.
