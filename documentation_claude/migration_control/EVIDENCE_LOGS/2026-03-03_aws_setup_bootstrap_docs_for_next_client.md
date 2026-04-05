# Session Evidence - AWS Setup Bootstrap Docs for Next Client

Date: 2026-03-03
Operator: Codex

## Goal
Persist the Atlas browser-agent AWS setup script and convert it into a reusable onboarding runbook for future client migrations.

## Changes Applied
- Added canonical runbook:
  - `AWS_ACCOUNT_SETUP_NEXT_CLIENT_RUNBOOK.md`
- Archived raw script transcript:
  - `EVIDENCE_LOGS/2026-03-03_atlas_agent_mode_aws_setup_raw_script.md`
- Updated startup prompt catalog with AWS bootstrap prompt:
  - `STARTUP_PROMPTS.md`
- Updated control-plane index/read order:
  - `README.md`
- Recorded ADR entry:
  - `DECISIONS.md`

## Intended Reuse
- New sessions can bootstrap source/target/operator roles and CLI profiles with a consistent checklist.
- Prompt-driven sessions can start from an approved text block without re-deriving IAM/STS assumptions.
