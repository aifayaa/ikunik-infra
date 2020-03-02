#!/bin/bash

# libs
cd libs
npm i

# no deps
cd ../api-v1
npm i
npx sls deploy --stage $1 --region $2

cd ../apps
npm i
npx sls deploy --stage $1 --region $2

# requires root api only
cd ../account
npm i
npx sls deploy --stage $1 --region $2
cd ../auth
npm i
npx sls deploy --stage $1 --region $2
cd ../maintenance
npm i
npx sls deploy --stage $1 --region $2
cd ../ssr
npm i
npx sls deploy --stage $1 --region $2
cd ../press
npm i
npx sls deploy --stage $1 --region $2

# + authorizer
cd ../audios
npm i
npx sls deploy --stage $1 --region $2
cd ../authorize
npm i
npx sls deploy --stage $1 --region $2
cd ../banners
npm i
npx sls deploy --stage $1 --region $2
cd ../blast
npm i
npx sls deploy --stage $1 --region $2
cd ../carts
npm i
npx sls deploy --stage $1 --region $2
cd ../contactLists
npm i
npx sls deploy --stage $1 --region $2
cd ../contacts
npm i
npx sls deploy --stage $1 --region $2
cd ../credits
npm i
npx sls deploy --stage $1 --region $2
cd ../crowd
npm i
npx sls deploy --stage $1 --region $2
cd ../fees
npm i
npx sls deploy --stage $1 --region $2
cd ../festivals
npm i
npx sls deploy --stage $1 --region $2
cd ../files
npm i
docker run --rm -v "$PWD":/var/task lambci/lambda:build-nodejs12.x npm rebuild
npx sls deploy --stage $1 --region $2
cd ../genres
npm i
npx sls deploy --stage $1 --region $2
cd ../media
npm i
npx sls deploy --stage $1 --region $2
cd ../orders
npm i
npx sls deploy --stage $1 --region $2
cd ../payouts
npm i
npx sls deploy --stage $1 --region $2
cd ../pictures
npm i
npx sls deploy --stage $1 --region $2
cd ../search
npm i
npx sls deploy --stage $1 --region $2
cd ../shop
npm i
npx sls deploy --stage $1 --region $2
cd ../stages
npm i
npx sls deploy --stage $1 --region $2
cd ../tokenPackages
npm i
npx sls deploy --stage $1 --region $2
cd ../users
npm i
npx sls deploy --stage $1 --region $2
cd ../userMetrics
npm i
npx sls deploy --stage $1 --region $2

# + users root api id
cd ../artists
npm i
npx sls deploy --stage $1 --region $2
cd ../projects
npm i
npx sls deploy --stage $1 --region $2
cd ../selections
npm i
npx sls deploy --stage $1 --region $2
cd ../subscriptions
npm i
npx sls deploy --stage $1 --region $2
cd ../perms
npm i
npx sls deploy --stage $1 --region $2

# + artists api id
cd ../favorites
npm i
npx sls deploy --stage $1 --region $2

# + festivals & stages api id
cd ../lineup
npm i
npx sls deploy --stage $1 --region $2

# + lineups api id
cd ../tickets
npm i
npx sls deploy --stage $1 --region $2

cd ../scanners
npm i
npx sls deploy --stage $1 --region $2

# + press api id
cd ../pressCategories
npm i
npx sls deploy --stage $1 --region $2

cd ../pressArticles
npm i
npx sls deploy --stage $1 --region $2

cd ../pressSearch
npm i
npx sls deploy --stage $1 --region $2


cd ../pushNotifications
npm i
npx sls deploy --stage $1 --region $2

cd ../userGeneratedContents
npm i
npx sls deploy --stage $1 --region $2
