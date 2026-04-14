# Crowdaa Microservices

## Migration Runbooks

- AWS backend clone replication: `documentation_claude/doc/AWS_BACKEND_CLONE_REPLICATION_RUNBOOK.md`
- Source-ARN hardening matrix: `documentation_claude/doc/AWS_BACKEND_CLONE_PHASE11_SOURCE_ARN_MATRIX.md`
- Production clone smoke script: `./smoke_prod_clone.sh`
- UAT options A/B/C runbook: `documentation_claude/doc/UAT_OPTIONS_ABC_RUNBOOK.md`
- UAT options A/B/C runner: `./uat_options_abc.sh`

# Development environment

We use Node 16 in CI/runtime, and `node 18` is the safe local deploy runtime for this repo.

Install the following plugin in VSCode:
| Extension name | Extension identifier |
| ------ | ------ |
| Prettier - Code formatter | esbenp.prettier-vscode |
| ESLint | dbaeumer.vscode-eslint |

## Example of manipulation of

Move to the concern directory, as "./ghanty" for example.

Deploy a end point 'myEndPoint':

```
./node_modules/.bin/serverless deploy function -f myEndPoint --stage prod --region eu-west-3
./node_modules/.bin/serverless deploy function -f myEndPoint --stage dev --region us-east-1
```

Deploy end points from the current directory:

```
./node_modules/.bin/serverless deploy --stage prod --region eu-west-3
./node_modules/.bin/serverless deploy --stage dev --region us-east-1
```

Log:

```
./node_modules/.bin/serverless logs --stage prod --region eu-west-3 -f myEndPoint
./node_modules/.bin/serverless logs --stage dev --region us-east-1 -f myEndPoint
```

Log which stays opened:

```
./node_modules/.bin/serverless logs --stage prod --region eu-west-3 -f myEndPoint -t
./node_modules/.bin/serverless logs --stage dev --region us-east-1 -f myEndPoint -t
```

Remark : all `stage` / `region` combination can be found in `./prepare.js`.

## Run lambda function locally

Move to the concern directory, as "./ghanty" for example and launch the `sls-offline.sh` script.

## Setup

Just run `npm i`. It will install all dependancies in the current directory and then link `node_modules` to each sub-directories.

## Ikunik prod/us deploy guardrails

- Use `node 18` locally for deploys. `serverless` v3 + repo plugins are not reliable on `node 25`.
- Use the repo-local binary:
  - `./node_modules/.bin/serverless`
- Do not use bare `npx serverless`, which can pull Serverless v4 and require login.
- The deploy path expects:
  - `npm_package_name=crowdaa-microservices/<service>`
  - `MS_DEPLOYMENT_BUCKET=ms-deployment-<region>-<aws_account_id>`
- `./deploy.sh` now sets those automatically when possible.
- For Ikunik `prod/us`, the canonical Mongo source of truth is:
  - `api-v1/serverless.js -> custom.mongoDB.prod.us-east-1`
- Services importing `env.js` now resolve `MONGO_URL` from that source directly.
- Do not rely on the CloudFormation export `api-v1:prod:MongoURL` for Ikunik `prod/us`; it can still point to legacy values.

## Specific concerns

### libs

This folder is used by other modules, that's not a microservice by itself.

### ./deployDiff.sh

This file deploys changes microservices on dev/preprod/prod automatically using gitlab-ci. When a variable `CI_FIRST_DEPLOY` is defined at `true` in the AWS microservice codebuild environment variables, it will run a full & deploy to create everything, not using the changed folders list. This variable is needed for all of the codebuilds in the codepipeline.
