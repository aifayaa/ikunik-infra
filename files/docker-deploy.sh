#!/bin/bash

rm -rf node_modules
npm i --unsafe-perm

serverless deploy --stage "$STAGE" --region "$REGION"
