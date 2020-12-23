#!/bin/bash

STAGE="$1"
REGION="$2"
ALL="$3"

REGION_ARGS=()

if [ -n "$REGION" ]; then
  REGION_ARGS=(--region "$REGION")
fi

usage() {
  echo "usage : ./deploy.sh [STAGE] [REGION] [ALL]"
  echo ""
  echo "    Deploy all microservices for a STAGE on a REGION"
  echo "    STAGE can be dev, preprod, prod, awax, awaxDev"
  echo "    REGION can be empty ('') to use the default one, or all AWS available regions, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions"
  echo "    ALL Set to the value « ALL » to deploy all microservices, even those who are not currently being worked on"
}

runSlsDeployFor() {
  folder="$1"
  echo "Deploying $folder"
  cd "$folder"
  npx --node-arg=--max-old-space-size=2000 sls deploy --stage "$STAGE" "${REGION_ARGS[@]}"
  cd ..
}

runNpmCustomDeployFor() {
  folder="$1"
  echo "Deploying $folder"
  cd "$folder"
  # Uses environment variable "$REGION"
  export REGION
  npm run "deploy:$STAGE"
  cd ..
}

if ([ "$STAGE" != "dev" ] && [ "$STAGE" != "preprod" ] && [ "$STAGE" != "prod" ] && [ "$STAGE" != "awax" ] && [ "$STAGE" != "awaxDev" ]) || [ -z "$REGION" ] ; then
  usage
  exit 1
fi

npm i
npm run install

# no deps
runSlsDeployFor 'api-v1'
runSlsDeployFor 'account'
runSlsDeployFor 'apps'
runSlsDeployFor 'admin'

# requires root api only
runSlsDeployFor 'auth'
runSlsDeployFor 'maintenance'
runSlsDeployFor 'ssr'

# + authorizer
test "x$ALL" = "xALL" && runSlsDeployFor 'audios'
runSlsDeployFor 'authorize'
test "x$ALL" = "xALL" && runSlsDeployFor 'banners'
runSlsDeployFor 'blast'
test "x$ALL" = "xALL" && runSlsDeployFor 'carts'
runSlsDeployFor 'contactLists'
runSlsDeployFor 'contacts'
runSlsDeployFor 'credits'
runSlsDeployFor 'crowd'
test "x$ALL" = "xALL" && runSlsDeployFor 'fees'
test "x$ALL" = "xALL" && runSlsDeployFor 'festivals'
runNpmCustomDeployFor 'files'
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

# + users root api id
test "x$ALL" = "xALL" && runSlsDeployFor 'artists'
test "x$ALL" = "xALL" && runSlsDeployFor 'projects'
runSlsDeployFor 'selections'
test "x$ALL" = "xALL" && runSlsDeployFor 'subscriptions'
runSlsDeployFor 'perms'

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
runSlsDeployFor 'pressCategories'
runSlsDeployFor 'pressArticles'
runSlsDeployFor 'pressSearch'
runSlsDeployFor 'pushNotifications'
runSlsDeployFor 'userGeneratedContents'
