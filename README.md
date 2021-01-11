# Crowdaa Microservices

## Setup

Just run `npm i`. It will install all dependancies in the current directory and then link `node_modules` to each sub-directories.

## Specific concerns

### libs

This folder is used by other modules, that's not a microservice by itself.

### files

This microservice requires `docker` and `docker-compose` to be run because it rebuilds the `sharp` npm module on the proper architecture for AWS.

### ./deployDiff.sh

This file deploys changes microservices on dev/preprod/prod automatically using gitlab-ci. When a variable `CI_FIRST_DEPLOY` is defined at `true` in the AWS microservice pipeline environment variables, it will run a full & deploy to create everything, not using the changed folders list.

When doing this, you should also increase the pipeline timeout to 2 hours, because the deployment currently takes around 1 hour and 15 minutes.
