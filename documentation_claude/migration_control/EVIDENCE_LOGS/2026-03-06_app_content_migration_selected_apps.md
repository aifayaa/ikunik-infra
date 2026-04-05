# 2026-03-06 - App content migration to Ikunik storage (selected app IDs)

## Scope
- Target account: `670296240767`
- Source content hosts (legacy): `d1tmdgml10ct6o.cloudfront.net`, `live-streams-recordings.s3.amazonaws.com`
- Target media bucket: `ikunik-media-content-prod-us-670296240767`
- Target TOS bucket: `ikunik-tos-prod-us-670296240767`
- Scoped app IDs:
  - `8f8bc36d-4746-4130-a230-92065641a3a4`
  - `05e8d798-57b8-413d-b1cc-d81866c01cf0`
  - `d75be5e1-101e-44dd-8796-b1865dd5a1b3`
  - `ff9d384a-83b8-4f39-8b7d-7207622e7745`
  - `eae6deb6-66dc-4f31-8f5d-e4ebf0889f21`

## Migration actions
1. Created target media bucket:
   - `ikunik-media-content-prod-us-670296240767`
2. Enabled public read for object delivery and CORS on target media bucket.
3. Built source URL set from scoped app-linked data and extracted legacy media URLs.
4. Downloaded and migrated legacy media objects (including HLS manifest-linked objects) to Ikunik media bucket.
5. Created target TOS bucket:
   - `ikunik-tos-prod-us-670296240767`
6. Seeded TOS artifact to Ikunik naming path:
   - `ikunik-dashboard/20250805-IKUNIK_TOS.pdf`
7. Updated target runtime config storage names in `env.js` to Ikunik buckets.
8. Rewrote scoped app media URLs from legacy host to Ikunik media host in app documents.

## Command results
- Media migration summary:
  - `target_bucket_objects_bytes=197 162388746`
  - failed downloads: `0` (`/tmp/ikunik_content_failed.json`)
- URL availability validation (migrated media URL set):
  - `total=73 ok=73 fail=0`
- Sample object checks:
  - `pictures/thumb-71679066-f749-4369-8448-3920bcc6c6ff.jpeg` -> `200`
  - `pictures/medium-f9156a92-abe3-4af0-bdb0-6ea1470353bf.jpeg` -> `200`
  - `videos/81bfe649-7751-44e0-a71f-e8deac251e1e/81bfe649-7751-44e0-a71f-e8deac251e1e.m3u8` -> `200`

## Post-migration state checks
- Scoped app records now point icons/startup video to:
  - `https://ikunik-media-content-prod-us-670296240767.s3.eu-west-3.amazonaws.com/...`
- TOS host configured for target lane:
  - `https://ikunik-tos-prod-us-670296240767.s3.eu-west-3.amazonaws.com`

## Legacy safety
- No legacy git push route was enabled.
- Migration writes were performed only to Ikunik-named buckets in target account.
