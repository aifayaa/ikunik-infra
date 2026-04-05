# Migration Charter

Last updated: 2026-03-06

## Objective
Build and validate the **Ikunik Platform** (API, dashboard, apps, CI/build chain, and temporary DB bridge) against cloned target infrastructure in a repeatable way, so the process can be reused for future infra clones with minimal drift.

## Non-negotiable constraints
- No writes to legacy infra repositories/remotes.
- No writes to legacy AWS resources during target migration execution.
- Legacy Crowdaa platform availability must not be impacted by Ikunik migration activities.
- No plaintext secrets committed to git.
- No milestone marked `done` without evidence in `EVIDENCE_LOGS/`.
- Keep one active scope lock for API + dashboard unless an explicit ADR approves expansion.

## Working repositories (target lane)
- Infra + control plane: `/Users/crowdaa/Desktop/gits/ikunik-infra`
- App build sources: `/Users/crowdaa/Desktop/gits/ikunik-app`
- Build tooling: `/Users/crowdaa/Desktop/gits/ikunik-build-tools`
- Dashboard: `/Users/crowdaa/Desktop/gits/ikunik-dashboard`

## Legacy repositories (read-only reference)
- `/Users/crowdaa/Desktop/gits/crowdaa_press_yui`
- `/Users/crowdaa/Desktop/gits/crowdaa_press_yui_targetinfra`
- `/Users/crowdaa/Desktop/gits/crowdaa_utils`

## Validation goal (current wave)
- Keep active target lane on `prod` + `us-east-1` for API and dashboard.
- Prepare dashboard deployment on temporary target domain without legacy DNS changes.
- Produce a build attempt for appId `05e8d798-57b8-413d-b1cc-d81866c01cf0` on target infra profile.
- Record outcome as `green` or `blocked` with exact blocker and next action.
