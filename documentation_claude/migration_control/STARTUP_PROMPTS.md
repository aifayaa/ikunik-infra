# Startup Prompts

Last updated: 2026-03-06

## New Client Replication Bootstrap Prompt

```text
You are taking over a new client infra replication.
Read in order:
1) documentation_claude/migration_control/MIGRATION_CHARTER.md
2) documentation_claude/migration_control/NEXT_CLIENT_REPLICATION_FRAMEWORK.md
3) documentation_claude/migration_control/WORKPLAN.md
4) documentation_claude/migration_control/DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md
5) documentation_claude/migration_control/TARGETS/target-<client>-prod-us-east-1-001.yaml
6) documentation_claude/migration_control/DOC_CONSISTENCY_RULES.md
7) documentation_claude/migration_control/STATUS_BOARD.yaml
Then execute Track A (API setup) only, produce evidence log, and update STATUS_BOARD.
Do not proceed to Track B/C/D until Track A is green or explicitly blocked with remediation.
```

## Dashboard Track Bootstrap Prompt

```text
You are executing Track B (Dashboard setup) for target infra replication.
Source of truth:
- documentation_claude/migration_control/DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md
- documentation_claude/migration_control/TARGETS/<target_id>.yaml
- documentation_claude/migration_control/DOC_CONSISTENCY_RULES.md

Constraints:
- Keep dashboard scope locked to the active lane (single stage/region).
- Keep legacy dashboard DNS untouched during temporary-domain validation.
- Use isolated dashboard repo; legacy remotes must stay push-disabled.
- No plaintext secrets in docs/evidence.

Tasks:
1) Confirm dashboard scope + temporary domain strategy in target YAML.
2) Produce dashboard infra-specific inventory and endpoint mapping.
3) Prepare deployment plan to temporary target URL.
4) Run smoke validation checklist and capture evidence.
5) Update STATUS_BOARD + DECISIONS if scope/policy changes.
```

## New Client AWS Account Bootstrap Prompt

```text
You are preparing AWS account access for a new client migration.
Use documentation_claude/migration_control/AWS_ACCOUNT_SETUP_NEXT_CLIENT_RUNBOOK.md as the source of truth.

Constraints:
- source account must be read-only via InfraDiscoveryRole
- target account uses InfraProvisionRole
- operator principal can only AssumeRole (no broad static admin policy)
- lock execution region explicitly before any deployment
- do not expose access keys or secret values in logs/docs

Tasks:
1) Collect SOURCE_ACCOUNT_ID, TARGET_ACCOUNT_ID, OPERATOR_ACCOUNT_ID, LOCKED_REGION.
2) Verify/define role trust and permission model for both roles.
3) Validate AWS CLI profile wiring (`source`, `target`) and STS identity checks.
4) Produce an evidence log with role ARNs, trust principals, and sts get-caller-identity outputs (redacted-safe).
5) Update STATUS_BOARD.yaml and DECISIONS.md with any setup decisions/blockers.
```
