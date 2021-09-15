#!/bin/bash

rm -rf node_modules
npm i

serverless deploy --stage "$STAGE" --region "$REGION"
