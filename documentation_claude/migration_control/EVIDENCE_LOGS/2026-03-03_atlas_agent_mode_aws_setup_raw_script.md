# Raw Script - AtlasGPT Agent Mode AWS Setup

Date captured: 2026-03-03
Source: user-provided browser transcript (AtlasGPT agent mode)
Purpose: preserve the original raw sequence used to set up AWS access for Codex migration execution.

---

You said:

You can do this, but don’t give Codex “full rights” on prod. The safe pattern is: temporary credentials + least privilege + read-only discovery on the source account + controlled apply on the target account. Below is a setup that works well with Codex CLI over SSH and AWS CLI.

1) Pick the safest architecture (recommended)
Option A (best): Codex runs on your machine, uses AWS SSO/STS

You run Codex locally.

AWS access is provided via AWS SSO or STS AssumeRole (short-lived).

No long-lived keys stored. Easy to rotate.

Option B: Codex runs on a “bastion” EC2 with an IAM role

You SSH into an EC2 instance.

That EC2 instance has an instance profile IAM role (no keys on disk).

Codex uses the instance role automatically.

Either way: Codex never needs root in AWS; it needs roles with specific policies.

2) Create two roles: “SourceReadOnly” and “TargetProvisioner”
Source account (where infra exists)

Create an IAM Role:

Name: InfraDiscoveryRole

Trust policy: allow your operator principal (you / your bastion role) to assume it

Permissions: read-only + extra “describe/list/get” for services you use

A good baseline is AWS managed:

ReadOnlyAccess
Then add a small inline policy for missing “list/describe” in some services if needed (common with Organizations, CloudFormation StackSets, some IAM reads, etc.).

Target account (where you duplicate)

Create an IAM Role:

Name: InfraProvisionRole

Trust policy: allow the same operator principal to assume it

Permissions: restricted provisioning permissions for only what you deploy

If using Terraform/CloudFormation, prefer permissions that match those services + the resources they create.

Avoid AdministratorAccess unless it’s a throwaway sandbox.

Key principle: Codex should be able to:

Discover source (read-only)

Plan/apply target (provision role)

Optionally validate (read-only on target after apply)

3) Give Codex access without handing over your entire AWS account
Preferred: STS AssumeRole with short-lived sessions

On the machine where Codex runs, configure AWS CLI profiles:

~/.aws/config

[profile source]
role_arn = arn:aws:iam::<SOURCE_ACCOUNT_ID>:role/InfraDiscoveryRole
source_profile = default
region = eu-west-3

[profile target]
role_arn = arn:aws:iam::<TARGET_ACCOUNT_ID>:role/InfraProvisionRole
source_profile = default
region = eu-west-3


Then Codex can run:

AWS_PROFILE=source aws ... for discovery

AWS_PROFILE=target aws ... for provisioning

If you use AWS SSO:

aws configure sso

then profiles reference sso_session instead of source_profile (still short-lived).

If you must use access keys (not recommended)

Create an IAM user with:

No console login

Mandatory MFA (where possible)

Keys rotated and stored only in a secure secret store
But again, role-based STS is better.

4) SSH access: do not give Codex your personal SSH keys

If Codex needs SSH to a machine (bastion/runner):

Create a dedicated Linux user, e.g. codex

Restrict what it can do

Use a dedicated SSH keypair with tight scope

Example on the bastion:

Disable password login

Restrict SSH key in ~codex/.ssh/authorized_keys with options:

no-agent-forwarding,no-port-forwarding,no-X11-forwarding

Consider forcing a command wrapper if you want hard restrictions (advanced).

But honestly, the cleanest is:

You SSH in as you

You run Codex there

AWS permissions are controlled by the assumed roles

5) What Codex should actually do (the workflow)

Codex shouldn’t “copy whatever it sees” by hand. Have it produce IaC then deploy.

Recommended pipeline

Inventory / discovery (source)

list accounts/regions used

enumerate VPCs, subnets, SGs, ALBs, ECS/EKS, RDS, S3, IAM roles, Route53, CloudWatch, Secrets, etc.

Export state (if you already use IaC)

Terraform: pull state, import missing resources

CloudFormation: export templates from stacks

Generate target IaC

Terraform modules or CloudFormation stacks

Plan

terraform plan or cfn-lint + change sets

Apply (target)

Validation

smoke tests, endpoint checks, IAM least-priv checks

6) Guardrails you should enable (so “full rights” isn’t needed)

Even with strong permissions, add these protections:

Separate AWS accounts: source vs target (you already do)

Permission boundaries on the target provision role

Service Control Policies (SCPs) if using AWS Organizations

Region allowlist (deny all regions except the ones you use)

Explicit denies for the scariest stuff (production):

deleting CloudTrail logs, disabling GuardDuty, deleting KMS keys, etc.

CloudTrail + AWS Config enabled so everything is auditable

7) The “Codex CLI prompt” you can use (copy/paste)

Use something like this (adjust services/regions):

You are operating an AWS infrastructure duplication project.

Rules:
- NEVER use long-lived AWS keys. Use AWS CLI profiles: source (read-only) and target (provision).
- Do not make destructive changes on source. Source is read-only.
- On target, apply changes only after producing an infrastructure-as-code plan and showing diffs.
- Prefer Terraform. If CloudFormation is already present, reuse templates where possible.
- Output a repo structure with:
  - /inventory (JSON/CSV of discovered resources)
  - /iac (Terraform or CFN)
  - /runbooks (step-by-step commands)
  - /validation (smoke tests)

Environment:
- Source profile: AWS_PROFILE=source
- Target profile: AWS_PROFILE=target
- Regions to scan: eu-west-3, eu-west-1 (edit as needed)

Tasks:
1) Discover all AWS resources in the source account in the allowed regions.
2) Produce a dependency graph (networking -> compute -> data -> edge/dns).
3) Generate IaC to recreate equivalent resources in target account.
4) Provide commands to plan/apply.
5) Provide a validation checklist and automated smoke tests.

Start by running read-only AWS CLI commands to enumerate services used, then proceed service by service.
Fail fast on permission errors: report missing IAM actions and propose least-privilege policy additions.


This gives Codex clear constraints and deliverables.

8) Common gotchas (so you don’t get stuck)

Secrets: don’t “copy” plaintext. Recreate secrets and rotate, or replicate via Secrets Manager replication.

KMS: KMS keys can’t be “duplicated” directly; you create new keys and re-encrypt.

IAM: roles/policies need careful re-creation; avoid copying trust relationships blindly.

DNS/ACM: certificates + validation differ; plan for re-issuance.

Resource names: global uniqueness (S3 bucket names!) will break naive duplication.

If you tell me what you’re duplicating (Terraform? CloudFormation? “clickops”?), and which core services (EKS/ECS, RDS, ALB, CloudFront, Route53, etc.), I’ll give you the exact minimal IAM policies for InfraDiscoveryRole and InfraProvisionRole and a concrete command checklist that Codex can run end-to-end.

(Conversation continued in agent mode with AWS Console UI steps.)

You said:
now guide me on aws console in order to do that

ChatGPT said (summary of actions):
- Create `InfraDiscoveryRole` in source account with `ReadOnlyAccess`, trust `arn:aws:iam::<OPERATOR_ACCOUNT_ID>:root`.
- Create `InfraProvisionRole` in target account with `PowerUserAccess` (recommended) or `AdministratorAccess` (sandbox only), same trust principal.
- Configure `~/.aws/config` profiles `source` and `target` using `role_arn` + `source_profile=default`.
- Run identity verification:
  - `AWS_PROFILE=source aws sts get-caller-identity`
  - `AWS_PROFILE=target aws sts get-caller-identity`
- Confirm locked region before execution (`eu-west-3` requested in this session).

Agent-mode execution notes in transcript:
- Target account used: `670296240767`
- `InfraProvisionRole` created in target with `AdministratorAccess` (explicit user choice in transcript).
- Operator setup guidance converged to:
  - create IAM user `codex-operator` (programmatic only, no console login)
  - attach minimal policy allowing `sts:AssumeRole` on `arn:aws:iam::670296240767:role/InfraProvisionRole`
- Repeated blocker noted:
  - AWS Console cookie preferences modal interrupted browser automation.

Codex-requested handoff from transcript:
- Create/complete `~/.aws/credentials` default profile with operator key pair.
- Keep `~/.aws/config` `target` profile pointing to `InfraProvisionRole`.
- Verify with:
  - `AWS_PROFILE=target aws sts get-caller-identity`
- Confirm region lock:
  - `eu-west-3`

Conversation end state in transcript:
- Role/profile pattern was agreed.
- Last missing operational step was local credential materialization and STS verification output.

---

Raw script preserved for reproducibility and next-client prompt engineering.
