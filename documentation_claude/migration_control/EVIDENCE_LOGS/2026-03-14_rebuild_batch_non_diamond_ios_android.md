# 2026-03-14 Rebuild Batch (Non-Diamond) iOS + Android

## Request scope
- Rebuild app list for both iOS and Android:
  - `3e9dbeb2-aeac-428d-8a87-dc4ed0b8c73d`
  - `8f8bc36d-4746-4130-a230-92065641a3a4`
  - `d75be5e1-101e-44dd-8796-b1865dd5a1b3`
  - `ff9d384a-83b8-4f39-8b7d-7207622e7745`
  - `eae6deb6-66dc-4f31-8f5d-e4ebf0889f21`
- Explicit skip:
  - `05e8d798-57b8-413d-b1cc-d81866c01cf0` (Diamond The Body already done)

## Execution notes
- Canonical build lane used:
  - product: `newui`
  - lane: `build`
  - stage/region: `prod/us`
  - wrapper: `/Users/crowdaa/Desktop/scripts/build/run_lane_build.sh`
- Required runtime fix during batch:
  - force Node 18 in PATH (`/usr/local/n/versions/node/18.20.7/bin`) to avoid Node 25 ESM/`yargs` crash.
- Build run mode:
  - `--no-screenshots` (stability/throughput; no screenshot requirement in this request).

## Raw artifacts
- Batch directory:
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens`
- Summary file:
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/summary.tsv`
- Progress file:
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/progress.log`

## Results by app/platform

### `3e9dbeb2-aeac-428d-8a87-dc4ed0b8c73d` (B5 Official)
- iOS: **FAILED (soft-fail in log)**
  - marker: `An error occured : Error: Missing data to start a build`
  - log: `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/3e9dbeb2-aeac-428d-8a87-dc4ed0b8c73d_ios.log`
- Android: **FAILED (soft-fail in log)**
  - marker: `An error occured : Error: Missing data to start a build`
  - log: `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/3e9dbeb2-aeac-428d-8a87-dc4ed0b8c73d_android.log`

### `8f8bc36d-4746-4130-a230-92065641a3a4`
- iOS: **SUCCESS**
- Android: **SUCCESS**
- logs:
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/8f8bc36d-4746-4130-a230-92065641a3a4_ios.log`
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/8f8bc36d-4746-4130-a230-92065641a3a4_android.log`

### `d75be5e1-101e-44dd-8796-b1865dd5a1b3`
- iOS: **SUCCESS**
- Android: **SUCCESS**
- logs:
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/d75be5e1-101e-44dd-8796-b1865dd5a1b3_ios.log`
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/d75be5e1-101e-44dd-8796-b1865dd5a1b3_android.log`

### `ff9d384a-83b8-4f39-8b7d-7207622e7745`
- iOS: **SUCCESS**
- Android: **SUCCESS**
- logs:
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/ff9d384a-83b8-4f39-8b7d-7207622e7745_ios.log`
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/ff9d384a-83b8-4f39-8b7d-7207622e7745_android.log`

### `eae6deb6-66dc-4f31-8f5d-e4ebf0889f21`
- iOS: **SUCCESS**
- Android: **SUCCESS**
- logs:
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/eae6deb6-66dc-4f31-8f5d-e4ebf0889f21_ios.log`
  - `/Users/crowdaa/Desktop/build_runs/rebuild_wave_20260314_node18_noscreens/eae6deb6-66dc-4f31-8f5d-e4ebf0889f21_android.log`

## Batch conclusion
- Non-Diamond rebuild request executed end-to-end.
- 4/5 requested app IDs rebuilt successfully on both platforms.
- 1/5 app ID (`3e9dbeb2-aeac-428d-8a87-dc4ed0b8c73d`) is blocked by missing build source data in DB and requires app build metadata remediation before rebuild can pass.
