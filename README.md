# Crowdaa Microservices

## Migration Runbooks

- AWS backend clone replication: `documentation_claude/doc/AWS_BACKEND_CLONE_REPLICATION_RUNBOOK.md`
- Source-ARN hardening matrix: `documentation_claude/doc/AWS_BACKEND_CLONE_PHASE11_SOURCE_ARN_MATRIX.md`
- Migration control plane index: `documentation_claude/migration_control/README.md`
- Next-client dashboard deployment runbook: `documentation_claude/migration_control/DASHBOARD_DEPLOYMENT_NEXT_CLIENT_RUNBOOK.md`
- Production clone smoke script: `./smoke_prod_clone.sh`
- UAT options A/B/C runbook: `documentation_claude/doc/UAT_OPTIONS_ABC_RUNBOOK.md`
- UAT options A/B/C runner: `./uat_options_abc.sh`

# Development environment

We use Node 16.

Install the following plugin in VSCode:
| Extension name | Extension identifier |
| ------ | ------ |
| Prettier - Code formatter | esbenp.prettier-vscode |
| ESLint | dbaeumer.vscode-eslint |

## Example of manipulation of

Move to the concern directory, as "./ghanty" for example.

Deploy a end point 'myEndPoint':

```
npx sls deploy function -f myEndPoint --stage prod --region eu-west-3
npx sls deploy function -f myEndPoint --stage dev --region us-east-1
```

Deploy end points from the current directory:

```
npx sls deploy --stage prod --region eu-west-3
npx sls deploy --stage dev --region us-east-1
```

Log:

```
npx sls logs --stage prod --region eu-west-3 -f myEndPoint
npx sls logs --stage dev --region us-east-1 -f myEndPoint
```

Log which stays opened:

```
npx sls logs --stage prod --region eu-west-3 -f myEndPoint -t
npx sls logs --stage dev --region us-east-1 -f myEndPoint -t
```

Remark : all `stage` / `region` combination can be found in `./prepare.js`.

## Run lambda function locally

Move to the concern directory, as "./ghanty" for example and launch the `sls-offline.sh` script.

## Setup

Just run `npm i`. It will install all dependancies in the current directory and then link `node_modules` to each sub-directories.

## Specific concerns

### libs

This folder is used by other modules, that's not a microservice by itself.

### ./deployDiff.sh

This file deploys changes microservices on dev/preprod/prod automatically using gitlab-ci. When a variable `CI_FIRST_DEPLOY` is defined at `true` in the AWS microservice codebuild environment variables, it will run a full & deploy to create everything, not using the changed folders list. This variable is needed for all of the codebuilds in the codepipeline.

## US Bootstrap Notes (Migration)

For first-time US (`prod` + `us-east-1`) bootstrap in target account:

- Use Node 16 when invoking serverless locally:
  - `npx -y -p node@16 node ../node_modules/serverless/bin/serverless.js ...`
- Use explicit deployment bucket:
  - `MS_DEPLOYMENT_BUCKET=ms-deployment-us-east-1-670296240767`
- If ACM/custom-domain prerequisites are not ready yet, deploy API stack without domain-manager:
  - `SKIP_CUSTOM_DOMAIN=1`
- If existing S3 upload bucket notifications are not yet permission-ready for `files`, bootstrap without the S3 event hook:
  - `SKIP_FILES_S3_HOOK=1`

These switches are only for controlled bootstrap/dark-launch. Remove them once custom-domain and S3-event prerequisites are fully configured.
