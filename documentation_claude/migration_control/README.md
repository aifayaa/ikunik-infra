# Migration Control Plane

Last updated: 2026-03-02

This directory is the single source of truth for multi-session / multi-agent migration work.

## Purpose
- Keep migration context in git files (not in chat memory).
- Guarantee continuity between Codex sessions.
- Ensure isolation from legacy infrastructure while cloning toward target infra.

## Session Start Protocol
1. Read `STATUS_BOARD.yaml`.
2. Read latest file in `EVIDENCE_LOGS/`.
3. Read `DECISIONS.md`.
4. Pick only tasks marked `pending`/`in_progress` from the active milestone.
5. Execute, then write evidence + update `STATUS_BOARD.yaml`.

## Session End Protocol
1. Update `STATUS_BOARD.yaml` statuses and timestamps.
2. Append objective evidence to `EVIDENCE_LOGS/<date>_<session>.md`.
3. Record any new decision in `DECISIONS.md`.
4. Produce handoff using `HANDOFF_TEMPLATE.md`.

## Core Files
- `MIGRATION_CHARTER.md`: scope, constraints, and non-negotiables.
- `TARGETS/*.yaml`: target-specific parameters.
- `LEGACY_MARKERS.md`: forbidden legacy values and regex checks.
- `WORKPLAN.md`: milestone definitions and acceptance gates.
- `STATUS_BOARD.yaml`: machine-readable state board.
- `DECISIONS.md`: architecture/operation decisions.
- `HANDOFF_TEMPLATE.md`: required handoff structure.

