#!/bin/bash

STAGE="$1"
REGION="$2"
ALL="$3"

usage() {
  echo "usage : ./deploy.sh [STAGE] [REGION] [ALL]"
  echo ""
  echo "    Deploy all microservices for a STAGE on a REGION"
  echo "    STAGE can be dev, preprod, prod, awax, awaxDev"
  echo "    REGION must be set to one of the possible regions for the API, see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions for a list of all regions"
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
  npx --node-arg=--max-old-space-size=2000 sls deploy --stage "$STAGE" --region "$REGION"
  cd ..
}

runNpmCustomDeployFor() {
  folder="$1"
  echo "Deploying $folder"
  cd "$folder"
  npm run deploy --stage="$STAGE" --region="$REGION"
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
runSlsDeployFor 'pressSearch'
runSlsDeployFor 'pressAutomation'
runSlsDeployFor 'blast'
runSlsDeployFor 'pushNotifications'
runSlsDeployFor 'userBadges'
runSlsDeployFor 'userGeneratedContents'
