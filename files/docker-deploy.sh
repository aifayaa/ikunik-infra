#!/bin/bash

rm -rf node_modules
npm i

if [ -n "$REGION" ]; then
  REGION_ARGS=(--region "$REGION")
fi

serverless deploy --stage "$STAGE" "${REGION_ARGS[@]}"
