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
- Mongo URLs are no longer allowed in git.
- `api-v1/serverless.js` now resolves Mongo URLs from deploy-time environment variables:
  - `MONGO_URL_DEV_US_EAST_1`
  - `MONGO_URL_PREPROD_EU_WEST_3`
  - `MONGO_URL_PROD_US_EAST_1`
  - `MONGO_URL_PROD_EU_WEST_3`
- Services importing `env.js` resolve `MONGO_URL` from that source.
- `./deploy.sh` fails fast if the required `MONGO_URL_*` variable is missing.
- Recommended local secret file:
  - `~/.crowdaa/ikunik-infra-deploy-secrets.sh`
- Example local secret file content:

```
export MONGO_URL_DEV_US_EAST_1='...'
export MONGO_URL_PREPROD_EU_WEST_3='...'
export MONGO_URL_PROD_US_EAST_1='...'
export MONGO_URL_PROD_EU_WEST_3='...'
```

- Never commit that file.
- Before pushing infra changes, run:

```
rg -n "mongodb\\+srv://|mongodb://|AKIA|MAILGUN_API_KEY|SNS_SECRET|SMTP_PASSWORD" .
```

- The result must be reviewed and cleaned before push.

## Specific concerns

### libs

This folder is used by other modules, that's not a microservice by itself.

### appLiveStreams prod/us

For `appLiveStreams` on `prod/us-east-1`, two AWS resources must exist in the
Ikunik account before deploy/runtime validation:

- an IVS Realtime storage configuration referenced by
  `LIVE_STREAM_RECORDING_CONFIGURATION_ARN`
- an IVS Chat logging configuration referenced by
  `LIVE_STREAM_LOGGING_CONFIGURATION_ARN`

Do not copy stale ARNs from historical configs and assume they still exist.
Always verify them in the target account first:

```bash
AWS_PROFILE=target aws ivs-realtime list-storage-configurations --region us-east-1
AWS_PROFILE=target aws ivschat list-logging-configurations --region us-east-1
```

If the logging configuration is missing, create it before reusing the ARN:

```bash
AWS_PROFILE=target aws logs create-log-group \
  --log-group-name /aws/ivschat/prod-us-appLiveStreams \
  --region us-east-1

AWS_PROFILE=target aws ivschat create-logging-configuration \
  --name ikunik-appLiveStreams-prod-us \
  --destination-configuration cloudWatchLogs={logGroupName=/aws/ivschat/prod-us-appLiveStreams} \
  --region us-east-1
```

When `CreateRoom` is denied on the logging configuration ARN, verify the
resource exists before changing IAM. A missing logging configuration can
surface as an `ivschat:CreateRoom` access error.

### ./deployDiff.sh

This file deploys changes microservices on dev/preprod/prod automatically using gitlab-ci. When a variable `CI_FIRST_DEPLOY` is defined at `true` in the AWS microservice codebuild environment variables, it will run a full & deploy to create everything, not using the changed folders list. This variable is needed for all of the codebuilds in the codepipeline.
