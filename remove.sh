#!/bin/bash

usage() {
  echo "usage : ./remove.sh [STAGE] [REGION]"
  echo ""
  echo "    Remove all microservices for a STAGE deployed on a REGION"
  echo "    STAGE can be dev, prod, awax, awaxDev"
  echo "    REGION can be all AWS available regions, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions"
}

if ([ "$1" != "dev" ] && [ "$1" != "prod" ] && [ "$1" != "awax" ] && [ "$1" != "awaxDev" ]) || [ -z "$2" ] ; then 
  usage
fi

# no deps
cd api-v1
npx sls remove --stage $1 --region $2

cd ../apps
npx sls remove --stage $1 --region $2

# requires root api only
cd ../account
npx sls remove --stage $1 --region $2
cd ../auth
npx sls remove --stage $1 --region $2
cd ../maintenance
npx sls remove --stage $1 --region $2
cd ../ssr
npx sls remove --stage $1 --region $2
cd ../press
npx sls remove --stage $1 --region $2

# + authorizer
cd ../audios
npx sls remove --stage $1 --region $2
cd ../authorize
npx sls remove --stage $1 --region $2
cd ../banners
npx sls remove --stage $1 --region $2docker run --rm -v "$PWD":/var/task lambci/lambda:build-nodejs12.x npm rebuild
cd ../blast
npx sls remove --stage $1 --region $2
cd ../carts
npx sls remove --stage $1 --region $2
cd ../contactLists
npx sls remove --stage $1 --region $2
cd ../contacts
npx sls remove --stage $1 --region $2
cd ../credits
npx sls remove --stage $1 --region $2
cd ../crowd
npx sls remove --stage $1 --region $2
cd ../fees
npx sls remove --stage $1 --region $2
cd ../festivals
npx sls remove --stage $1 --region $2
cd ../files
npx sls remove --stage $1 --region $2
cd ../genres
npx sls remove --stage $1 --region $2
cd ../media
npx sls remove --stage $1 --region $2
cd ../orders
npx sls remove --stage $1 --region $2
cd ../payouts
npx sls remove --stage $1 --region $2
cd ../pictures
npx sls remove --stage $1 --region $2
cd ../search
npx sls remove --stage $1 --region $2
cd ../shop
npx sls remove --stage $1 --region $2
cd ../stages
npx sls remove --stage $1 --region $2
cd ../tokenPackages
npx sls remove --stage $1 --region $2
cd ../users
npx sls remove --stage $1 --region $2
cd ../userMetrics
npx sls remove --stage $1 --region $2

# + users root api id
cd ../artists
npx sls remove --stage $1 --region $2
cd ../projects
npx sls remove --stage $1 --region $2
cd ../selections
npx sls remove --stage $1 --region $2
cd ../subscriptions
npx sls remove --stage $1 --region $2
cd ../perms
npx sls remove --stage $1 --region $2

# + artists api id
cd ../favorites
npx sls remove --stage $1 --region $2

# + festivals & stages api id
cd ../lineup
npx sls remove --stage $1 --region $2

# + lineups api id
cd ../tickets
npx sls remove --stage $1 --region $2

cd ../scanners
npx sls remove --stage $1 --region $2

# + press api id
cd ../pressCategories
npx sls remove --stage $1 --region $2

cd ../pressArticles
npx sls remove --stage $1 --region $2

cd ../pressSearch
npx sls remove --stage $1 --region $2

cd ../pushNotifications
npx sls remove --stage $1 --region $2

cd ../userGeneratedContents
npx sls remove --stage $1 --region $2
