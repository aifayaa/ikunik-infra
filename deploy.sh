#!/bin/bash

STAGE="$1"
REGION="$2"
ALL="$3"

export NODE_OPTIONS='--max_old_space_size=4096'

SECRETS_FILE="${IKUNIK_INFRA_SECRETS_FILE:-$HOME/.crowdaa/ikunik-infra-deploy-secrets.sh}"

if [ -f "$SECRETS_FILE" ]; then
  # shellcheck disable=SC1090
  . "$SECRETS_FILE"
fi

if [ -x /usr/local/bin/node ]; then
  export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
fi

usage() {
  echo "usage : ./deploy.sh [STAGE] [REGION] [ALL]"
  echo ""
  echo "    Deploy all microservices for a STAGE on a REGION"
  echo "    STAGE can be dev, preprod, prod"
  echo "    REGION must be set to eu-west-3, us-east-1. One of the possible regions for the API, see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions for a list of all regions"
  echo "    ALL Set to the value « ALL » to deploy all microservices, even those who are not currently being worked on"
}

if [ -z "$STAGE" ] || [ -z "$REGION" ]; then
  echo "MISSING STAGE ($STAGE) OR REGION ($REGION) PARAMETER" 1>&2
  usage
  exit 1
fi

runSlsDeployFor() {
  folder="$1"
  echo "Deploying $folder"
  cd "$folder"
  export npm_package_name="${npm_package_name:-crowdaa-microservices/$folder}"
  if [ -z "$MS_DEPLOYMENT_BUCKET" ]; then
    account_id=$(aws sts get-caller-identity --query Account --output text)
    export MS_DEPLOYMENT_BUCKET="ms-deployment-$REGION-$account_id"
  fi
  ./node_modules/.bin/serverless deploy --stage "$STAGE" --region "$REGION"
  cd ..
}

mongoVarNameFor() {
  case "$STAGE:$REGION" in
    dev:us-east-1) echo "MONGO_URL_DEV_US_EAST_1" ;;
    preprod:eu-west-3) echo "MONGO_URL_PREPROD_EU_WEST_3" ;;
    prod:us-east-1) echo "MONGO_URL_PROD_US_EAST_1" ;;
    prod:eu-west-3) echo "MONGO_URL_PROD_EU_WEST_3" ;;
    *)
      echo ""
      ;;
  esac
}

requireMongoSecret() {
  if [ "$STAGE:$REGION" = "prod:us-east-1" ]; then
    if ! aws ssm get-parameter \
      --region us-east-1 \
      --name /ikunik/prod/us-east-1/api-v1/mongo-url \
      --query Parameter.ARN \
      --output text >/dev/null; then
      echo "Missing required SSM parameter: /ikunik/prod/us-east-1/api-v1/mongo-url" 1>&2
      exit 1
    fi
    return
  fi

  mongo_var_name="$(mongoVarNameFor)"
  if [ -z "$mongo_var_name" ]; then
    echo "No mongo secret mapping configured for STAGE=$STAGE REGION=$REGION" 1>&2
    exit 1
  fi

  mongo_var_value="$(printenv "$mongo_var_name")"
  if [ -z "$mongo_var_value" ]; then
    echo "Missing required secret: $mongo_var_name" 1>&2
    echo "Provide it through $SECRETS_FILE or export it in the shell before deploy." 1>&2
    exit 1
  fi
}

runNpmCustomDeployFor() {
  folder="$1"
  echo "Deploying $folder"
  cd "$folder"
  npm run deploy --stage="$STAGE" --region="$REGION"
  cd ..
}

if ([ "$STAGE" != "dev" ] && [ "$STAGE" != "preprod" ] && [ "$STAGE" != "prod" ] && [ "$STAGE" != "awax" ] && [ "$STAGE" != "awaxDev" ]) || [ -z "$REGION" ]; then
  usage
  exit 1
fi

requireMongoSecret

npm i
npm run install

# no deps
runSlsDeployFor 'api-v1'
runSlsDeployFor 'account'
runSlsDeployFor 'apps'
runSlsDeployFor 'admin'
runSlsDeployFor 'organizations'

# requires root api only
runSlsDeployFor 'auth'
runSlsDeployFor 'maintenance'
runSlsDeployFor 'ssr'

# + authorizer
runSlsDeployFor 'blockedContents'
runSlsDeployFor 'ai'
runSlsDeployFor 'forms'
test "x$ALL" = "xALL" && runSlsDeployFor 'audios'
runSlsDeployFor 'authorize'
test "x$ALL" = "xALL" && runSlsDeployFor 'banners'
test "x$ALL" = "xALL" && runSlsDeployFor 'carts'
runSlsDeployFor 'chat'
runSlsDeployFor 'contactLists'
runSlsDeployFor 'contacts'
runSlsDeployFor 'credits'
runSlsDeployFor 'crowd'
test "x$ALL" = "xALL" && runSlsDeployFor 'fees'
test "x$ALL" = "xALL" && runSlsDeployFor 'festivals'
runSlsDeployFor 'files'
test "x$ALL" = "xALL" && runSlsDeployFor 'genres'
runSlsDeployFor 'media'
test "x$ALL" = "xALL" && runSlsDeployFor 'orders'
test "x$ALL" = "xALL" && runSlsDeployFor 'payouts'
runSlsDeployFor 'pictures'
runSlsDeployFor 'videos'
runSlsDeployFor 'purchasableProducts'
runSlsDeployFor 'search'
test "x$ALL" = "xALL" && runSlsDeployFor 'shop'
test "x$ALL" = "xALL" && runSlsDeployFor 'stages'
test "x$ALL" = "xALL" && runSlsDeployFor 'tokenPackages'
runSlsDeployFor 'users'
runSlsDeployFor 'userMetrics'
runSlsDeployFor 'providers'
runSlsDeployFor 'ghanty'

# + users root api id
test "x$ALL" = "xALL" && runSlsDeployFor 'artists'
test "x$ALL" = "xALL" && runSlsDeployFor 'projects'
runSlsDeployFor 'selections'
test "x$ALL" = "xALL" && runSlsDeployFor 'subscriptions'
runSlsDeployFor 'perms'
runSlsDeployFor 'termsOfServices'

# + artists api id
test "x$ALL" = "xALL" && runSlsDeployFor 'favorites'

# + festivals & stages api id
test "x$ALL" = "xALL" && runSlsDeployFor 'lineup'

# + lineups api id
test "x$ALL" = "xALL" && runSlsDeployFor 'tickets'
test "x$ALL" = "xALL" && runSlsDeployFor 'scanners'

# + admin
runSlsDeployFor 'press'

# + press api id
runSlsDeployFor 'liveStream'
runSlsDeployFor 'pressCategories'
runSlsDeployFor 'pressArticles'
runSlsDeployFor 'pressPolls'
runSlsDeployFor 'pressSearch'
runSlsDeployFor 'pressAutomation'
runSlsDeployFor 'blast'
runSlsDeployFor 'pushNotifications'
runSlsDeployFor 'userBadges'
runSlsDeployFor 'userGeneratedContents'
