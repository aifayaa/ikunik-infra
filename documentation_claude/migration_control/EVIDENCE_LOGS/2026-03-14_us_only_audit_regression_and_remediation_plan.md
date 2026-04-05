# 2026-03-14 US-only Audit Regression and Remediation Plan

## Scope
- Repositories reviewed:
  - `ikunik-app`
  - `ikunik-dashboard`
  - `ikunik-infra`
  - `ikunik-build-tools`
- Objective: verify that app + API + Mongo path is Ikunik-only and US-only, and identify migration leftovers.

## Result
- Verdict: **NOT fully US-only / Ikunik-only yet**.
- Runtime and deploy paths still contain FR/EU and legacy Crowdaa markers in active configuration files.

## Evidence Summary (key files)

### 1) API/infra still contains active non-US and legacy mappings
- `env.js`
  - `S3_BUCKET_TOS_HOST` points to `s3.eu-west-3.amazonaws.com`.
  - `S3_REGION` is `eu-west-3`.
  - `SMTP_SERVER` is `email-smtp.eu-west-3.amazonaws.com:465`.
  - SNS ARNs and `SNS_REGION` still reference legacy `us-west-2` resources.
  - `MONGODB_ENCRYPTION_KEY` path still under `/crowdaa_microservices/...`.
- `api-v1/serverless.js`
  - `custom.domains` still defines FR/preprod domains (`api-fr`, `preprod-api`).
  - `custom.mongoDB` still includes FR/preprod/prod-fr entries.
  - `custom.crowdaaRegion` still maps `eu-west-3 -> fr`.
- `prepare.js`
  - still allows `preprod:eu-west-3` and `prod:eu-west-3`.
- `.gitlab-ci.yml`
  - manual region options still include `eu-west-3`.

### 2) Build tooling still includes FR/preprod profiles and legacy DB endpoints
- `js/settings.json`
  - includes `prod.fr` and `preprod.fr` blocks with legacy FR endpoints and hosts.
  - US block exists and points to Ikunik US API/Mongo, but file still contains multi-region legacy data.
- Build libs still operate on generic `stage/region` matrix and are not hard-scoped to US lane.

### 3) App repo has US prod profile but still carries FR/preprod and legacy defaults
- `.env.prod.us` uses US API Gateway URL (good).
- `.env.prod.fr` and `.env.preprod.fr` still present and configured.
- `.gitlab-ci.yml` default `IKUNIK_TARGET_API_BASE_URL` still set to `https://api.aws.crowdaa.com/v1`.
- `bin/generate-preview.sh` still contains FR/preprod case mappings.
- `TARGET_INFRA_BUILD_READY.md` endpoint statements are stale vs current `.env.prod.us`.

### 4) Dashboard is closest to US-only but still partially legacy-coupled
- `serverless.yml` region map is US-only (`us -> us-east-1`).
- `prodAppSettings.ts` enables only `crowdaa-us` region.
- `appRegionsSettings.ts` still contains legacy URL fields and Crowdaa naming.
- `.gitlab-ci.yml` default API base uses legacy canonical value (`https://api.aws.crowdaa.com/v1`), overridable by env.

## AWS runtime verification attempt
- `aws sts get-caller-identity` confirms account `670296240767`.
- Runtime read checks were attempted but blocked by IAM:
  - `ssm:GetParametersByPath` denied.
  - `apigateway:GET` denied.
- Consequence: deployed control-plane runtime could not be fully re-verified in this session with current IAM policy.

## Remediation Plan (execution order)

1. **P0 Safety and branch control**
- Freeze deploys on active target branches until cleanup PRs are merged.
- Enforce `HEAD == origin/<branch>` guard before any build/deploy.

2. **P1 API/infra US hard-scope**
- Remove FR/preprod domain and region mappings from active target deploy path in `api-v1/serverless.js`.
- Restrict `prepare.js` to allowed US combinations for target lane.
- Replace EU/legacy constants in `env.js` (S3/SMTP/SNS/SSM namespace) with US Ikunik values.
- Restrict CI `REGION` options to `us-east-1` for target lane.

3. **P2 Build tools US hard-scope**
- Split or prune `js/settings.json` active target profile to US-only entries.
- Move secrets/URIs out of tracked JSON into secure injection (SSM/env/CI vars).
- Keep FR/preprod only in explicitly archived legacy profile if still required; never in active target lane.

4. **P3 App + dashboard alignment**
- Remove or quarantine FR/preprod env files from active target branch.
- Set CI default target API to US execute-api endpoint for target lane.
- Update preview scripts/docs so active branch profile cannot resolve to FR/preprod paths.

5. **P4 Validation and sign-off**
- Run:
  - dashboard US-only bundle check,
  - authenticated dashboard `/apps` US-only validation,
  - API smoke/UAT against US endpoint,
  - one iOS + one Android build from canonical lane.
- Archive command logs and outputs in `EVIDENCE_LOGS/`.
- Mark milestones/tasks green only after evidence is attached.

6. **P5 Security close-out**
- Rotate any credentials exposed in repository configs.
- Add/prefer automated secret scanning gate in CI for target lane.

## Operator Note
- This audit re-opens M10 closure claims until the above cleanup and re-validation are completed.
