# Migration Charter

Last updated: 2026-03-02

## Objective
Build and validate apps against cloned target infrastructure in a repeatable way, so the process can be reused for future infra clones with minimal drift.

## Non-negotiable constraints
- No writes to legacy infra repositories/remotes.
- No writes to legacy AWS resources during target migration execution.
- No plaintext secrets committed to git.
- No milestone marked `done` without evidence in `EVIDENCE_LOGS/`.

## Working repositories (target lane)
- Infra + control plane: `/Users/crowdaa/Desktop/gits/ikunik-infra`
- App build sources: `/Users/crowdaa/Desktop/gits/ikunik-app`
- Build tooling: `/Users/crowdaa/Desktop/gits/ikunik-build-tools`

## Legacy repositories (read-only reference)
- `/Users/crowdaa/Desktop/gits/crowdaa_press_yui`
- `/Users/crowdaa/Desktop/gits/crowdaa_press_yui_targetinfra`
- `/Users/crowdaa/Desktop/gits/crowdaa_utils`

## Validation goal (current wave)
- Produce a build attempt for appId `05e8d798-57b8-413d-b1cc-d81866c01cf0` on target infra profile.
- Record outcome as `green` or `blocked` with exact blocker and next action.

