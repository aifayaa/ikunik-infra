# Legacy Markers (Forbidden)

Last updated: 2026-03-02

Any occurrence in target-lane repos must be treated as migration debt unless explicitly documented as temporary compatibility.

## Account IDs
- `630176884077` (legacy source account)

## Known host/domain patterns
- `*.aws.crowdaa.com`
- `gitlab.aws.crowdaa.com`

## ARN patterns
- `arn:aws:.*:630176884077:.*`

## Detection commands
```bash
# Run in each target-lane repo
rg -n "630176884077|gitlab\.aws\.crowdaa\.com|aws\.crowdaa\.com|arn:aws:.*:630176884077" .
```

## Temporary exceptions policy
- Allowed only when needed to keep UAT path alive.
- Must be listed in `STATUS_BOARD.yaml` under `temporary_exceptions`.
- Must include owner + removal milestone.

