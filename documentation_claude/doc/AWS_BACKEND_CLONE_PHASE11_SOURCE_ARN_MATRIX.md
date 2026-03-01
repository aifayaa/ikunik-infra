# Phase 11 Source ARN Hardening Matrix

Last updated: 2026-03-01

## Objective
Remove hardcoded source account references (`630176884077`) and redeploy impacted modules in safe order.

## Module order (executed)

| Wave | Module | Priority | Focus |
| --- | --- | --- | --- |
| 1 | appsBuilds | P2 | async lambda invoke IAM ARN |
| 1 | organizations | P2 | async lambda invoke IAM ARN |
| 1 | blast | P1 | notification/state machine ARNs |
| 1 | files | P1 | media + bucket + IAM ARNs |
| 1 | userMetrics | P2 | async lambda invoke IAM ARN |
| 2 | ghanty | P1 | state machine ARNs |
| 2 | liveStream | P0 | IVS + state machine + invoke ARNs |
| 2 | appLiveStreams | P0 | IVS/IVSChat + state machine + invoke ARNs |
| 2 | pressCategories | P2 | async lambda invoke IAM ARN |
| 2 | pressArticles | P1 | state machine ARNs |
| 3 | userGeneratedContents | P1 | SNS + IAM role ARNs |

## Pattern applied
1. Add `custom.awsAccountId: '${aws:accountId}'` where missing.
2. Replace hardcoded account segment in ARN strings with `${self:custom.awsAccountId}`.
3. Redeploy module in `prod/eu-west-3`.
4. Verify stack status and smoke behavior.

## Completion criteria
- `rg -n "630176884077" --glob "*/serverless.js"` returns 0.
- All `deployOrderList` module stacks are `CREATE_COMPLETE` or `UPDATE_COMPLETE`.
