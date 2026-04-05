# AWS Account Setup Runbook (Next Client)

Last updated: 2026-03-06

## Purpose
Standardize how to prepare AWS access so Codex can execute infra replication safely for a new client.

This runbook covers:
- source account discovery role (read-only),
- target account provision role (controlled write),
- operator credentials/profile setup,
- verification commands and guardrails.

## Target Outcome
Codex can run:
- `AWS_PROFILE=source` for read-only discovery
- `AWS_PROFILE=target` for provisioning in target account

without long-lived admin credentials and without source-account writes.

## Inputs Required Per Client
- `SOURCE_ACCOUNT_ID`
- `TARGET_ACCOUNT_ID`
- `OPERATOR_ACCOUNT_ID` (where keys/profile used by Codex live)
- locked production region (recommended: `us-east-1` unless client mandates otherwise)

## Part A - Source Account (Read-Only Discovery)
1. Open source account AWS Console.
2. IAM -> Roles -> Create role.
3. Trusted entity type: `AWS account`.
4. Trusted account: `OPERATOR_ACCOUNT_ID`.
5. Attach permission policy:
   - `ReadOnlyAccess` (baseline)
6. Role name:
   - `InfraDiscoveryRole`
7. Validate trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<OPERATOR_ACCOUNT_ID>:root"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Part B - Target Account (Provision Role)
1. Open target account AWS Console.
2. IAM -> Roles -> Create role.
3. Trusted entity type: `AWS account`.
4. Trusted account: `OPERATOR_ACCOUNT_ID`.
5. Attach permissions:
   - preferred for first pass: `PowerUserAccess`
   - temporary bootstrap fallback: `AdministratorAccess` (only if explicitly accepted for this client)
6. Role name:
   - `InfraProvisionRole`
7. Validate trust policy (same pattern as source role).

## Part C - Operator Principal for Codex
Use a dedicated IAM user (or SSO principal) in operator account, not personal admin identity.

### Minimal required permission for operator principal
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
        "arn:aws:iam::<SOURCE_ACCOUNT_ID>:role/InfraDiscoveryRole",
        "arn:aws:iam::<TARGET_ACCOUNT_ID>:role/InfraProvisionRole"
      ]
    }
  ]
}
```

## Part D - AWS CLI Profile Setup (Plain keys + role assumption)
`~/.aws/credentials`
```ini
[default]
aws_access_key_id = <OPERATOR_ACCESS_KEY_ID>
aws_secret_access_key = <OPERATOR_SECRET_ACCESS_KEY>
# aws_session_token = <SESSION_TOKEN>  # only for temporary credentials
```

`~/.aws/config`
```ini
[profile source]
role_arn = arn:aws:iam::<SOURCE_ACCOUNT_ID>:role/InfraDiscoveryRole
source_profile = default
region = <LOCKED_REGION>
output = json

[profile target]
role_arn = arn:aws:iam::<TARGET_ACCOUNT_ID>:role/InfraProvisionRole
source_profile = default
region = <LOCKED_REGION>
output = json
```

## Part E - Verification (Mandatory Before Codex Execution)
Run:
```bash
AWS_PROFILE=source aws sts get-caller-identity
AWS_PROFILE=target aws sts get-caller-identity
```

Expected:
- `source` ARN shows assumed role `InfraDiscoveryRole`.
- `target` ARN shows assumed role `InfraProvisionRole`.
- account IDs match expected source/target.

Also confirm in writing:
- locked prod region is explicit (`us-east-1` or approved alternative).

## Part F - Guardrails (Mandatory)
- source account role must stay read-only.
- no root account usage.
- no plaintext keys in docs/evidence/chat.
- no destructive actions on source account.
- CloudTrail enabled in target account.
- prefer least privilege over admin role after bootstrap.

## Part G - Codex Handoff Snippet
Use this once profiles are verified:

```text
AWS profiles are ready.
Source role: arn:aws:iam::<SOURCE_ACCOUNT_ID>:role/InfraDiscoveryRole
Target role: arn:aws:iam::<TARGET_ACCOUNT_ID>:role/InfraProvisionRole
Region lock: <LOCKED_REGION>
Validation:
- AWS_PROFILE=source aws sts get-caller-identity => assumed-role/InfraDiscoveryRole
- AWS_PROFILE=target aws sts get-caller-identity => assumed-role/InfraProvisionRole
Proceed with Track A (API setup) in migration control-plane.
```

## Part H - Common Blocking Issue (AWS Console Agent Mode)
If browser automation is blocked by cookie-preferences modal:
- resolve cookie modal manually once,
- complete IAM creation flow manually to the point before secret display,
- generate/store keys locally only,
- continue with CLI-based verification and Codex handoff.

## Evidence to Save
Store in `EVIDENCE_LOGS/`:
- role ARNs created
- trusted principal used
- verification command outputs (redacted as needed)
- final region lock decision
