# Crowdaa Microservices

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
