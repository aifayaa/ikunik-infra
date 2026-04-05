# 2026-03-06 - Ikunik Platform runtime smoke and isolation verification

## Scope
- Platform: Ikunik
- Target lane: prod + eu-west-3
- Target API: https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod
- Target dashboard temp URL: https://d1jmbvp87c05ud.cloudfront.net

## Commands executed

1) API smoke
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra && ./smoke_prod_clone.sh
```
Result:
- `/` 200
- `/press/articles` 200
- `/userGeneratedContents` 200
- `/files/formats` 200
- `/appLiveStreams` 200
- `/providers/CPME/websitePage?...` 200
- `/chat/self/session` 401
- `/users/me` 401
- `smoke_result=PASSED failures=0`

2) App startup API contract (FR env profile)
```bash
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/validate_app_api_contract.sh \
  --env-file /Users/crowdaa/Desktop/gits/ikunik-app/.env.prod.fr
```
Result:
- Guest mode:
  - `/apps/settings` 200
  - `/apps/perms` 200
  - `/press/categories` 200
- Contract summary: `Contract check PASSED.`

3) Dashboard smoke wired to target API
```bash
API_KEY=$(rg -n '^REACT_APP_API_KEY=' /Users/crowdaa/Desktop/gits/ikunik-app/.env.prod.fr -m1 | cut -d= -f2-)
DASHBOARD_URL='https://d1jmbvp87c05ud.cloudfront.net' \
API_BASE_URL='https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod' \
API_KEY="$API_KEY" \
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/smoke_dashboard_target.sh
```
Result:
- `dashboard_root_status=200`
- `dashboard_api_wiring=ok`
- public API probes 200
- `login_probe_status=404` (accepted by smoke script)
- `smoke_result=PASSED`

4) Isolation policy check
```bash
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/check_isolation.sh
```
Result:
- app/build-tools/dashboard remote policy valid
- no legacy push-enabled remotes
- `Isolation checks passed.`

## Legacy safety note
- This run executed only read-only HTTP probes (`curl`) and local file/document checks.
- No deployment or write command was executed against legacy Crowdaa AWS accounts/resources.

## GitHub source-of-truth cutover blocker check
Command:
```bash
for u in \
  git@github.com-aifayaa:aifayaa/ikunik-app.git \
  git@github.com-aifayaa:aifayaa/ikunik-build-tools.git \
  git@github.com-aifayaa:aifayaa/ikunik-dashboard.git; do
  git ls-remote --heads "$u"
done
```
Result:
- all three repos return `Repository not found`.
- account authentication itself is valid (`ssh -T git@github.com-aifayaa` succeeds).

Impact:
- `origin` cutover for app/build-tools remains blocked.
- local-seed `origin` fallback must remain active to keep deterministic builds operational.

## GitHub cutover completion (aifayaa repos)

### Remote branch presence
```bash
git ls-remote --heads git@github.com-aifayaa:aifayaa/ikunik-app.git
git ls-remote --heads git@github.com-aifayaa:aifayaa/ikunik-build-tools.git
git ls-remote --heads git@github.com-aifayaa:aifayaa/ikunik-dashboard.git
```
Observed:
- `ikunik-app`: `233dacc... refs/heads/staging/target-infra-build-ready`
- `ikunik-build-tools`: `86ea178... refs/heads/master`
- `ikunik-dashboard`: `d41963a... refs/heads/main`

### Origin remotes now point to GitHub target repos
- `/Users/crowdaa/Desktop/gits/ikunik-app`:
  - `origin=git@github.com-aifayaa:aifayaa/ikunik-app.git`
- `/Users/crowdaa/Desktop/gits/ikunik-build-tools`:
  - `origin=git@github.com-aifayaa:aifayaa/ikunik-build-tools.git`
- `/Users/crowdaa/Desktop/gits/ikunik-dashboard`:
  - `origin=git@github.com-aifayaa:aifayaa/ikunik-dashboard.git`

### Branch parity checks
- App canonical seed repo (non-shallow branch seed used for first push):
  - repo: `/tmp/ikunik-app-seed.a2Sphz`
  - `HEAD=233dacc`
  - `origin/staging/target-infra-build-ready=233dacc`
- Build-tools local workspace:
  - `HEAD=86ea178`
  - `origin/master=86ea178`
- Dashboard local workspace:
  - `HEAD=d41963ab`
  - `origin/main=d41963ab`

### Note on current app workspace divergence
- `/Users/crowdaa/Desktop/gits/ikunik-app` remains on pre-seed history (`bab1e35`) and shows divergence vs new GitHub root commit (`233dacc`) with local uncommitted changes.
- This does not block target-lane source-of-truth cutover because build reset source is now GitHub `origin/staging/target-infra-build-ready`.
- Before production build execution from this workspace, operators should either:
  - run a clean reset to `origin/staging/target-infra-build-ready`, or
  - use a clean clone from GitHub target repo.

## UAT ABC execution (target lane)
Command:
```bash
API_KEY=$(rg -n '^REACT_APP_API_KEY=' /Users/crowdaa/Desktop/gits/ikunik-app/.env.prod.fr -m1 | cut -d= -f2-)
cd /Users/crowdaa/Desktop/gits/ikunik-infra
API_KEY="$API_KEY" BASE_URL='https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod' ./uat_options_abc.sh
```
Result:
- Option A: PASS
- Option B: PASS
- Option C: PASS
- Final green gates: PASS
  - `GATE.source_arn_zero`
  - `GATE.stack_reconcile_green`
- Summary: `pass=58 fail=0`
- Full log: `/Users/crowdaa/Desktop/backend_clone_handoff/logs/uat_options_abc_20260306T124044Z.log`

## Local canary-equivalent closure for CI/build + temporary bridge gates
Rationale:
- Target repos are now GitHub-based and isolated from legacy push paths.
- In this session, canary validation was executed through local equivalents of CI job gates and runtime gates.

Validated controls:
1) Target account isolation:
```bash
AWS_PROFILE=crowdaa AWS_REGION=eu-west-3 aws sts get-caller-identity
```
- account confirmed: `670296240767`

2) Remote/push isolation guard:
```bash
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/check_isolation.sh
```
- pass for app/build-tools/dashboard

3) API + runtime canary:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra && ./smoke_prod_clone.sh
```
- pass

4) Full UAT + reconcile gates:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra
API_KEY=<target app key> BASE_URL=https://6koicomg10.execute-api.eu-west-3.amazonaws.com/prod ./uat_options_abc.sh
```
- summary: `pass=58 fail=0`
- includes final gates:
  - `GATE.source_arn_zero`
  - `GATE.stack_reconcile_green`

Inference:
- Temporary legacy-bridge runtime is healthy under auth/content/ugc/metrics/load checks.
- Target-lane CI/build safety objectives are met via local canary-equivalent guard execution without touching legacy infra.

## Next-step execution: clean canonical app workspace
Command:
```bash
git clone --single-branch --branch staging/target-infra-build-ready \
  git@github.com-aifayaa:aifayaa/ikunik-app.git \
  /Users/crowdaa/Desktop/gits/ikunik-app-target-clean
```
Result:
- Clean canonical workspace created for deterministic builds.
- Parity check:
  - `HEAD=233dacc`
  - `origin/staging/target-infra-build-ready=233dacc`
- This workspace is now preferred for production build execution.

## Post-green roadmap continuation checks (M3/M7 kickoff)
Date:
- 2026-03-06

Commands:
```bash
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/check_control_plane_consistency.sh
/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/scripts/check_isolation.sh
```
Result:
- `consistency_result=PASSED failures=0`
- `Isolation checks passed.`

Branch parity snapshot:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-app && git rev-parse --short HEAD && git rev-parse --short origin/staging/target-infra-build-ready
cd /Users/crowdaa/Desktop/gits/ikunik-app-target-clean && git rev-parse --short HEAD && git rev-parse --short origin/staging/target-infra-build-ready
```
Observed:
- `/Users/crowdaa/Desktop/gits/ikunik-app`: `HEAD=bab1e35a`, `origin=233dacc5` (divergent; workspace is dirty and not release-safe).
- `/Users/crowdaa/Desktop/gits/ikunik-app-target-clean`: `HEAD=233dacc`, `origin=233dacc` (release-safe canonical workspace).

Security baseline scan highlights:
```bash
cd /Users/crowdaa/Desktop/gits/ikunik-infra
rg -n --hidden -g'!.git' -e 'AKIA[0-9A-Z]{16}' -e 'ASIA[0-9A-Z]{16}' -e 'aws_secret_access_key' -e 'BEGIN PRIVATE KEY'
```
Findings:
- `env.js` contains static AWS access key IDs (`SMTP_LOGIN`, `SNS_KEY_ID`).
- docs placeholders include `aws_secret_access_key` token string (template context).

Target action opened:
- Security isolation and readiness closure tasks added to `STATUS_BOARD.yaml` (`T-031` to `T-034`).

Secrets inventory bootstrap:
- Created `/Users/crowdaa/Desktop/gits/ikunik-infra/documentation_claude/migration_control/INVENTORY/target-prod-fr-clone-001/secrets_inventory.csv`.
- Captured active inline credential items from `env.js` with target secret-store destination placeholders for migration.
- Updated target profile to lock release workspace:
  - `TARGETS/target-prod-fr-clone-001.yaml` now includes `repositories.release_build_workspace=/Users/crowdaa/Desktop/gits/ikunik-app-target-clean`.
