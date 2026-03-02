# Evidence Log - 2026-03-02 - Session migration_control_and_build

## Scope
- Initialize migration control-plane artifacts for multi-session replication.
- Establish isolated target-lane repos.
- Start validation build track for appId `05e8d798-57b8-413d-b1cc-d81866c01cf0`.

## Isolation evidence
- Created local target-lane repositories:
  - `/Users/crowdaa/Desktop/gits/ikunik-infra`
  - `/Users/crowdaa/Desktop/gits/ikunik-app`
  - `/Users/crowdaa/Desktop/gits/ikunik-build-tools`
- Remote policy configured:
  - `origin` = local seed clone, push disabled
  - `legacy` = GitLab source, push disabled
  - `github` = target owner repository URL

## Notes
- `ikunik-app` and `ikunik-build-tools` GitHub repositories are not available yet (repository not found).
- Build validation execution details appended in subsequent section during this session.

## Build validation - appId 05e8d798-57b8-413d-b1cc-d81866c01cf0

### Preflight
- App lookup in `prod/fr`: not found.
- Region resolution for this appId: `prod/us`.
- Runtime alignment for validation:
  - updated `ikunik-app/.env.prod.us`:
    - `REACT_APP_API_URL=https://ooeq303hg5.execute-api.eu-west-3.amazonaws.com/prod`
    - `REACT_APP_SSR_URL=qqhfk0vr85.execute-api.eu-west-3.amazonaws.com/prod`

### Attempt 1
- Command:
  - `./js/bin/buildAndroidV3 --appId 05e8d798-57b8-413d-b1cc-d81866c01cf0 --stage prod --region us --branch staging/target-infra-build-ready --no-screenshots --no-pipeline`
- Result:
  - blocked/stalled during `setup-android` (`cordova prepare` dependency install path).
  - process terminated and retried with targeted pre-install.

### Remediation between attempts
- Command:
  - `npm install cordova-android@14.0.1 --no-save --foreground-scripts --loglevel=info` (in `ikunik-app`).
- Result:
  - completed successfully.

### Attempt 2 (final)
- Command:
  - `./js/bin/buildAndroidV3 --appId 05e8d798-57b8-413d-b1cc-d81866c01cf0 --stage prod --region us --branch staging/target-infra-build-ready --no-screenshots --no-pipeline`
- Result:
  - success (`done`).
- Full build log:
  - `EVIDENCE_LOGS/2026-03-02_build_app_05e8d798_attempt2.log`
- Output artifacts:
  - `/Users/crowdaa/Desktop/gits/ikunik-app/app-05e8d798-57b8-413d-b1cc-d81866c01cf0.aab` (15M)
  - `/Users/crowdaa/Desktop/gits/ikunik-app/app-05e8d798-57b8-413d-b1cc-d81866c01cf0.apk` (16M)
- SHA-256:
  - `a366d0bdf44567a7ff64b89b00879163e2dd79ec8090b1e324b77ab42daebe02` (AAB)
  - `32a60a9ea308b44664bb2690c9fa169866fbe15456a0d6ec96cd467513915959` (APK)

### Workspace state after build
- `ikunik-app` is intentionally dirty after build (generated resources, config rewrites, artifacts).
- Do not commit generated files blindly.
- Keep only intentional profile/config deltas (for this session: `.env.prod.us` API/SSR override for target backend validation).
