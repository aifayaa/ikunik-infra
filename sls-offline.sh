#!/bin/bash

STAGE="dev"
REGION="us-east-1"
USER_ID="MzHRZDzLPttWzPCgn"
APP_ID="ca38e8a8-445a-44bf-b60e-c67fc440c65d"
AUTHORIZER_NAME=authorizerWithPerms

usage() {
  echo "usage : ./sls-offline.sh [PARAMS...] [-- EXTRA...]"
  echo ""
  echo "    Launch localy lambda functions for the current directory"
  echo ""
  echo "    Parameters:"
  echo ""
  echo "      -h --help : Display this help text"
  echo "      --stage : Provide the stage to use. Defaults to dev"
  echo "      --region : Provide the region to use. Defaults to us-east-1"
  echo "      --userId : Provide the user ID to use for this request. Defaults to MzHRZDzLPttWzPCgn"
  echo "      --appId : Provide the app ID to use for this request. Defaults to ca38e8a8-445a-44bf-b60e-c67fc440c65d"
  echo "      --authorizer : Select an authorizer format to use when executing the API. Defaults to authorizerWithPerms"
  echo "          Can be one in : authorizerWithPerms, remote"
  echo ""
  echo "    Examples:"
  echo "      ./sls-offline.sh"
  echo "      ./sls-offline.sh --stage preprod --region eu-west-3 --appId ca38e8a8-445a-44bf-b60e-c67fc440c65d"
  echo "      ./sls-offline.sh --stage prod --region us-east-1"
  echo "      ./sls-offline.sh --userId MzHRZDzLPttWzPCgn --appId ca38e8a8-445a-44bf-b60e-c67fc440c65d"
  echo "      ./sls-offline.sh --userId MzHRZDzLPttWzPCgn --appId ca38e8a8-445a-44bf-b60e-c67fc440c65d -- --httpPort 3004 --lambdaPort 3006"
  echo ""
}

while [ "$1" != '' ] && [ "$1" != '--' ]; do
  PARAM=$1
  VALUE=$2
  case $PARAM in
  -h | --help)
    usage
    exit
    ;;
  --userId)
    USER_ID=$VALUE
    ;;
  --appId)
    APP_ID=$VALUE
    ;;
  --authorizer)
    AUTHORIZER_NAME=$VALUE
    ;;
  --stage)
    STAGE=$VALUE
    ;;
  --region)
    REGION=$VALUE
    ;;
  *)
    echo "ERROR: unknown parameter \"$PARAM\""
    usage
    exit 1
    ;;
  esac
  shift
  shift
done

shift
EXTRA=$@

case "$AUTHORIZER_NAME" in
remote)
  true
  ;;
authorizerWithPerms | *)
  AUTHORIZER_NAME='authorizerWithPerms'
  AUTHORIZER='{"appId": "'"$APP_ID"'", "principalId": "'"$USER_ID"'", "perms": {"apps_getInfos":true,"apps_getProfile":true,"crowd_blast":true,"files_upload":true,"pressArticles_all":true,"pressCategories_all":true,"search_press":true,"userGeneratedContents_all":true,"userGeneratedContents_notify":true}, "integrationLatency": "43"}'
  ;;
esac

if [ -z "$STAGE" ] || [ -z "$REGION" ] || [ -z "$USER_ID" ] || [ -z "$APP_ID" ]; then
  echo "Error: a parameter is missing" 1>&2
  usage
  exit 1
fi

case "$STAGE:$REGION" in
'prod:us-east-1' | 'prod:eu-west-3' | 'dev:us-east-1' | 'preprod:eu-west-3') true ;;
*)
  echo "Error: Invalid stage/region combo" 1>&2
  usage
  exit 1
  ;;
esac

echo "STAGE : ${STAGE}"
echo "REGION : ${REGION}"
echo "USER_ID : ${USER_ID}"
echo "APP_ID : ${APP_ID}"
echo "AUTHORIZER : ${AUTHORIZER_NAME}"
echo "EXTRA : ${EXTRA}"

if [ -n "$AUTHORIZER" ]; then
  AUTHORIZER="$AUTHORIZER" npx sls offline --reloadHandler --stage=${STAGE} --region=${REGION} ${EXTRA}
else
  npx sls offline --reloadHandler --stage=${STAGE} --region=${REGION} ${EXTRA}
fi
