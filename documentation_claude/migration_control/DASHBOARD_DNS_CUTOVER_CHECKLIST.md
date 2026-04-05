# Dashboard DNS Cutover Checklist

Last updated: 2026-03-06

## Scope
- Active target: `target-prod-us-unified-001`
- Current temporary dashboard URL: `https://d1jmbvp87c05ud.cloudfront.net`
- Final URL: `runtime_endpoints.dashboard_final_url` in target profile

## Pre-cutover gates
1. Temporary dashboard URL smoke is green (`smoke_dashboard_target.sh`).
2. Dashboard bundle is wired to target API URL.
3. API smoke and login probe are green on target API.
4. ACM certificate for final dashboard domain is issued in CloudFront region (`us-east-1`).
5. DNS owner and rollback owner are assigned.

## Cutover steps
1. Attach final custom domain (CNAME/alias) to target CloudFront distribution.
2. Attach valid ACM certificate to the same distribution.
3. Update DNS record to target CloudFront domain.
4. Wait for DNS propagation window.
5. Run smoke checks on final custom domain.

## Rollback plan
If any critical smoke test fails after DNS switch:
1. Revert DNS record to previous known-good endpoint.
2. Confirm traffic returns to previous endpoint.
3. Invalidate target CloudFront cache if stale asset issue is detected.
4. Capture failure evidence and keep cutover status `blocked` until root cause is fixed.

## Post-cutover validation
1. Verify dashboard root page and SPA routing.
2. Verify auth flow reaches target API (expected controlled login failure on invalid credentials).
3. Verify key public API-backed pages load data.
4. Confirm monitoring/alerts and access logs are active.

## Current phase closure (2026-03-06)
- Effective final URL for this phase: `https://d1jmbvp87c05ud.cloudfront.net`
- Rationale: no custom-domain hosted-zone cutover available in current target account scope.
- Rollback drill evidence:
  - object path `__drill__/rollback-health.txt` served through CloudFront switched `version-A -> version-B -> version-A`.
  - evidence log: `EVIDENCE_LOGS/2026-03-06_plan_1_to_4_closure.md`.
