# Prompt for Atlas ChatGPT Browser - Ikunik target Atlas setup

Use this exact prompt in Atlas ChatGPT browser:

```text
You are assisting with MongoDB Atlas setup for Ikunik production DB replication.

Goal:
Prepare a NEW target Atlas environment for DB `crowdaaDev`, without changing any live API wiring yet.

Hard constraints:
1) Do NOT modify or stop the source cluster.
2) Do NOT trigger any application cutover.
3) Keep all credentials masked in your response except where explicitly requested.

Target setup requirements:
1) Create (or use) Atlas Project: `ikunik-prod-migration`.
2) Create target cluster name: `ikunik-prod-target-01`.
3) Region preference for compatibility with current runtime: AWS `eu-west-3`.
4) Enable continuous backups.
5) Create DB user `ikunik_migration_rw` with minimum required roles to restore data and indexes on `crowdaaDev`.
6) Add temporary network access for migration host IP: `83.198.195.44/32`.
7) If Atlas requires broader access for API runtime during tests, add temporary `0.0.0.0/0` with explicit note to tighten after cutover.

Output required back to me:
1) Atlas Project ID
2) Cluster name + region
3) Connection string SRV template for `crowdaaDev` in this format:
   `mongodb+srv://ikunik_migration_rw:<PASSWORD>@<cluster-host>/crowdaaDev?retryWrites=true&w=majority`
4) Confirmation that user + network access are active
5) Any blockers preventing restore/migration operations

Important:
Do not perform live migration or final cutover in this step. This is target preparation only.
```
