#!/bin/bash

STAGE="$1"
REGION="$2"

usage() {
  echo "usage : ./deploy.sh [STAGE] [REGION]"
  echo ""
  echo "    Deploy all microservices for a STAGE on a REGION"
  echo "    STAGE can be dev, prod, awax, awaxDev"
  echo "    REGION can be all AWS available regions, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions"
}

runSlsDeployFor() {
  folder="$1"
  echo "Deploying $folder"
  cd "$folder"
  npm i
  npx sls deploy --stage "$STAGE" --region "$REGION"
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

if ([ "$STAGE" != "dev" ] && [ "$STAGE" != "prod" ] && [ "$STAGE" != "awax" ] && [ "$STAGE" != "awaxDev" ]) || [ -z "$REGION" ] ; then
  usage
  exit 1
fi

# libs
cd 'libs'
npm i
cd ..

# no deps
runSlsDeployFor 'api-v1'
runSlsDeployFor 'apps'

# requires root api only
runSlsDeployFor 'account'
runSlsDeployFor 'auth'
runSlsDeployFor 'maintenance'
runSlsDeployFor 'ssr'
runSlsDeployFor 'press'

# + authorizer
runSlsDeployFor 'audios'
runSlsDeployFor 'authorize'
runSlsDeployFor 'banners'
runSlsDeployFor 'blast'
runSlsDeployFor 'carts'
runSlsDeployFor 'contactLists'
runSlsDeployFor 'contacts'
runSlsDeployFor 'credits'
runSlsDeployFor 'crowd'
runSlsDeployFor 'fees'
runSlsDeployFor 'festivals'
runNpmCustomDeployFor 'files'
runSlsDeployFor 'genres'
runSlsDeployFor 'media'
runSlsDeployFor 'orders'
runSlsDeployFor 'payouts'
runSlsDeployFor 'pictures'
runSlsDeployFor 'purchasableProducts'
runSlsDeployFor 'search'
runSlsDeployFor 'shop'
runSlsDeployFor 'stages'
runSlsDeployFor 'tokenPackages'
runSlsDeployFor 'users'
runSlsDeployFor 'userMetrics'

# + users root api id
runSlsDeployFor 'artists'
runSlsDeployFor 'projects'
runSlsDeployFor 'selections'
runSlsDeployFor 'subscriptions'
runSlsDeployFor 'perms'

# + artists api id
runSlsDeployFor 'favorites'

# + festivals & stages api id
runSlsDeployFor 'lineup'

# + lineups api id
runSlsDeployFor 'tickets'
runSlsDeployFor 'scanners'

# + press api id
runSlsDeployFor 'pressCategories'
runSlsDeployFor 'pressArticles'
runSlsDeployFor 'pressSearch'

runSlsDeployFor 'pushNotifications'

runSlsDeployFor 'userGeneratedContents'
