#!/bin/bash

STAGE="$1"
REGION="$2"
USERID="$3"

usage() {
  echo "usage : ./sls-offline.sh [STAGE] [REGION] [USERID]"
  echo ""
  echo "    Launch localy lambda functions for the current directory"
  echo ""
  echo "    Examples:"
  echo "      ./sls-offline.sh dev us-east-1 MzHRZDzLPttWzPCgn"
  echo "      ./sls-offline.sh preprod eu-west-3 MzHRZDzLPttWzPCgn"
  echo "      ./sls-offline.sh prod us-east-1 MzHRZDzLPttWzPCgn"
  echo "      ./sls-offline.sh prod eu-west-3 MzHRZDzLPttWzPCgn"
  echo ""
}

if [ -z "$STAGE" ] || [ -z "$REGION" ] || [ -z "$USERID" ]; then
  echo "Error: a parameter is missing " 1>&2
  usage
  exit 1
fi

echo "STAGE : ${STAGE}"
echo "REGION : ${REGION}"
echo "USERID : ${USERID}"

AUTHORIZER='{"appId": "ca38e8a8-445a-44bf-b60e-c67fc440c65d", "principalId": "'${USERID}'", "perms": {"apps_getInfos":true,"apps_getProfile":true,"crowd_blast":true,"files_upload":true,"pressArticles_all":true,"pressCategories_all":true,"search_press":true,"userGeneratedContents_all":true,"userGeneratedContents_notify":true}, "integrationLatency": "43"}' npx sls offline --reloadHandler --stage=${STAGE} --region=${REGION}


