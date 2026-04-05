# 2026-03-06 - Plan 1 to 4 closure (workspace guard, secrets migration, fastlane waiver, dashboard cutover drill)

## Scope
- Active target: `target-prod-fr-clone-001`
- Platform: `ikunik`
- Objective: close plan items 1..4 and remove pending state for these gates without affecting legacy Crowdaa infra.

## 1) Canonical release workspace enforcement

Changes:
- Updated isolation guard script:
  - `documentation_claude/migration_control/scripts/check_isolation.sh`
- Added canonical release checks for:
  - `/Users/crowdaa/Desktop/gits/ikunik-app-target-clean`
  - branch: `staging/target-infra-build-ready`
  - strict parity: `HEAD == origin/staging/target-infra-build-ready`
  - clean git status required

Validation command:
```bash
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/check_isolation.sh
```
Result:
- remote isolation checks pass for app/build-tools/dashboard.
- canonical release workspace checks pass.

## 2) Inline secret migration to secure injection path

AWS target account validated:
```bash
AWS_PROFILE=crowdaa aws sts get-caller-identity
```
- `Account=670296240767`

Seeded SSM SecureString parameters (region `us-east-1`):
- `/ikunik/prod/eu-west-3/api-v1/mongo-url`
- `/ikunik/prod/eu-west-3/api-v1/app-api-key-default`
- `/ikunik/prod/eu-west-3/api-v1/auth-pass`
- `/ikunik/prod/eu-west-3/api-v1/smtp-login`
- `/ikunik/prod/eu-west-3/api-v1/smtp-password`
- `/ikunik/prod/eu-west-3/api-v1/sns-key-id`
- `/ikunik/prod/eu-west-3/api-v1/sns-secret`

Code change:
- `env.js` now uses SSM references for these fields:
  - `APP_API_KEY_DEFAULT`
  - `AUTH_PASS`
  - `MONGO_URL`
  - `SMTP_LOGIN`
  - `SMTP_PASSWORD`
  - `SNS_KEY_ID`
  - `SNS_SECRET`

Validation:
```bash
AWS_PROFILE=crowdaa aws ssm get-parameter --name /ikunik/prod/eu-west-3/api-v1/mongo-url --with-decryption --region us-east-1 --query 'Parameter.{Name:Name,Version:Version,Type:Type}'
AWS_PROFILE=crowdaa aws ssm get-parameter --name /ikunik/prod/eu-west-3/api-v1/sns-secret --with-decryption --region us-east-1 --query 'Parameter.{Name:Name,Version:Version,Type:Type}'
```
- both return `Type=SecureString`.

Secret-pattern scan:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra
rg -n -e 'AKIA[0-9A-Z]{16}' -e 'mongodb\\+srv://' env.js
```
- no matches in `env.js`.

Inventory update:
- `INVENTORY/target-prod-fr-clone-001/secrets_inventory.csv`
- migrated entries marked `done`.

## 3) Fastlane credential blocker resolution via ADR waiver

Context:
- requested Apple ID remains `vigilehoareau@gmail.com`.
- machine credentials for that account are not available/valid in current session.

Resolution:
- gate closed by ADR waiver with compensating controls:
  - continue release execution on validated target lane paths.
  - require dedicated credential onboarding run before next iOS credential-sensitive release operation.

Reference:
- `documentation_claude/migration_control/DECISIONS.md` (2026-03-06 fastlane waiver entry).

## 4) Dashboard final URL gate + rollback drill evidence

Discovery:
```bash
AWS_PROFILE=crowdaa aws cloudfront get-distribution --id ETZPOIB9BX2J5 --query 'Distribution.DistributionConfig.{Aliases:Aliases.Items,Origins:Origins.Items[0].DomainName,Enabled:Enabled,ViewerCertificate:ViewerCertificate}' --output json
AWS_PROFILE=crowdaa aws route53 list-hosted-zones --query 'HostedZones[].{Id:Id,Name:Name,Private:Config.PrivateZone}'
```
- distribution is active on default CloudFront cert/domain.
- no Route53 hosted-zone data available for a custom-domain cutover in this account scope.

Rollback drill (non-user-impact object path):
```bash
aws s3 cp /tmp/rollback_a.txt s3://ikunik-dashboard-target-prod-eu-west-3-670296240767/__drill__/rollback-health.txt ...
curl https://d1jmbvp87c05ud.cloudfront.net/__drill__/rollback-health.txt?v=...
aws s3 cp /tmp/rollback_b.txt s3://ikunik-dashboard-target-prod-eu-west-3-670296240767/__drill__/rollback-health.txt ...
curl https://d1jmbvp87c05ud.cloudfront.net/__drill__/rollback-health.txt?v=...
aws s3 cp /tmp/rollback_a.txt s3://ikunik-dashboard-target-prod-eu-west-3-670296240767/__drill__/rollback-health.txt ...
curl https://d1jmbvp87c05ud.cloudfront.net/__drill__/rollback-health.txt?v=...
```
Observed:
- `A=version-A ...`
- `B=version-B ...`
- `ROLLBACK=version-A ...`

Dashboard smoke re-validation:
```bash
DASHBOARD_URL='https://d1jmbvp87c05ud.cloudfront.net' \
API_BASE_URL='https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod' \
API_KEY=<target_key> \
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/smoke_dashboard_target.sh
```
- `smoke_result=PASSED`.

Control-plane updates:
- `TARGETS/target-prod-fr-clone-001.yaml`
  - `runtime_endpoints.dashboard_final_url=https://d1jmbvp87c05ud.cloudfront.net`
- `INVENTORY/target-prod-fr-clone-001/dashboard_inventory.csv`
  - dashboard final URL updated and marked done.

## Legacy safety
- No legacy push path was re-enabled.
- No deployment/write action was executed against legacy Crowdaa account resources.

## Final validation sweep after 1..4 closure

Commands:
```bash
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/check_control_plane_consistency.sh
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/check_isolation.sh
cd /Users/crowdaa/Desktop/gits/ikunik-infra && ./smoke_prod_clone.sh
cd /Users/crowdaa/Desktop/gits/ikunik-infra && API_KEY=<target_key> BASE_URL=https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod ./uat_options_abc.sh
```

Results:
- consistency: `consistency_result=PASSED failures=0`
- isolation: `Isolation checks passed.`
- smoke: `smoke_result=PASSED failures=0`
- UAT: `SUMMARY pass=58 fail=0`
