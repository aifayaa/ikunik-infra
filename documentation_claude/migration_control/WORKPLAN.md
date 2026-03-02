# Workplan

Last updated: 2026-03-02

## Milestones and acceptance gates

### M0 - Isolation Ready
Acceptance:
- target-lane repos exist and are used for all changes.
- legacy remotes are push-disabled in target-lane workspaces.
- control-plane artifacts initialized.

### M1 - Config Isolation
Acceptance:
- target parameters captured in `TARGETS/<target_id>.yaml`.
- app endpoint profile is target-specific.
- no undocumented hardcoded legacy infra values in active build path.

### M2 - Build Chain Isolation
Acceptance:
- app + build-tools workflows run from target-lane repos.
- build branch/reset behavior documented and deterministic.
- execution does not require pushing to legacy repos.

### M3 - Security Isolation
Acceptance:
- secrets inventory completed.
- plaintext secrets replaced by secure injection path.
- secret rotation plan documented.

### M4 - App Build Green (Validation Goal)
Acceptance:
- build for appId `05e8d798-57b8-413d-b1cc-d81866c01cf0` completed successfully in target lane OR blocked with reproducible blocker and remediation steps.
- command log and output summary stored in `EVIDENCE_LOGS/`.

### M5 - Runtime Smoke Green
Acceptance:
- API smoke checks for key endpoints pass against target base URL.

### M6 - UAT Green
Acceptance:
- auth, content CRUD, file/media, async/stream flows validated.

### M7 - Production Readiness
Acceptance:
- legacy markers removed from production path.
- rollback runbook and cutover checklist complete.

