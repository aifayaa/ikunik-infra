# Prompt for Atlas ChatGPT Browser - finish target provisioning

```text
Continue Atlas setup for Ikunik DB migration.

Current state:
- Project ID: 69aec79813165dc982127a2b
- Cluster currently: Cluster0 in AWS us-east-1, still provisioning
- User exists: ikunik_migration_rw (currently atlasAdmin)
- Network allow-list includes 83.198.195.44/32

Goal:
Make the target cluster restore-ready with least privilege and return final connection details.

Tasks:
1) Wait until cluster is fully ready and SRV host is available.
2) Rename cluster to: ikunik-prod-target-01 (if Atlas permits now).
3) Reduce privileges for user ikunik_migration_rw from atlasAdmin to minimum needed for migration on DB crowdaaDev.
   - Must allow document restore and index creation on crowdaaDev.
   - Remove unnecessary admin-wide privileges.
4) Confirm 83.198.195.44/32 remains allow-listed and active.
5) Keep cutover untouched: do not alter source cluster, do not trigger app cutover.

Output required:
1) Final cluster name
2) Final SRV host and full URI template:
   mongodb+srv://ikunik_migration_rw:<PASSWORD>@<SRV_HOST>/crowdaaDev?retryWrites=true&w=majority
3) Exact role(s) now assigned to ikunik_migration_rw
4) Confirmation whether temporary 0.0.0.0/0 is required for API runtime tests (yes/no, with reason)
5) Any remaining blockers
```
