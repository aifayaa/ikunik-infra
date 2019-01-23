#!/bin/bash

# no deps
cd api-v1
npm i
sls deploy --stage $1 --region $2

# requires root api only
cd ../account
npm i
sls deploy --stage $1 --region $2
cd ../maintenance
npm i
sls deploy --stage $1 --region $2
cd ../ssr
npm i
sls deploy --stage $1 --region $2
cd ../press
npm i
sls deploy --stage $1 --region $2

# + authorizer
cd ../audios
npm i
sls deploy --stage $1 --region $2
cd ../authorize
npm i
sls deploy --stage $1 --region $2
cd ../banners
npm i
sls deploy --stage $1 --region $2
cd ../blast
npm i
sls deploy --stage $1 --region $2
cd ../carts
npm i
sls deploy --stage $1 --region $2
cd ../contactLists
npm i
sls deploy --stage $1 --region $2
cd ../contacts
npm i
sls deploy --stage $1 --region $2
cd ../credits
npm i
sls deploy --stage $1 --region $2
cd ../crowd
npm i
sls deploy --stage $1 --region $2
cd ../fees
npm i
sls deploy --stage $1 --region $2
cd ../festivals
npm i
sls deploy --stage $1 --region $2
cd ../files
npm i
docker run --rm -v "$PWD":/var/task lambci/lambda:build-nodejs8.10
sls deploy --stage $1 --region $2
cd ../genres
npm i
sls deploy --stage $1 --region $2
cd ../media
npm i
sls deploy --stage $1 --region $2
cd ../orders
npm i
sls deploy --stage $1 --region $2
cd ../payouts
npm i
sls deploy --stage $1 --region $2
cd ../pictures
npm i
sls deploy --stage $1 --region $2
cd ../search
npm i
sls deploy --stage $1 --region $2
cd ../shop
npm i
sls deploy --stage $1 --region $2
cd ../stages
npm i
sls deploy --stage $1 --region $2
cd ../tokenPackages
npm i
sls deploy --stage $1 --region $2
cd ../users
npm i
sls deploy --stage $1 --region $2

# + users root api id
cd ../artists
npm i
sls deploy --stage $1 --region $2
cd ../projects
npm i
sls deploy --stage $1 --region $2
cd ../selections
npm i
sls deploy --stage $1 --region $2
cd ../subscriptions
npm i
sls deploy --stage $1 --region $2

# + artists api id
cd ../favorites
npm i
sls deploy --stage $1 --region $2

# + festivals & stages api id
cd ../lineup
npm i
sls deploy --stage $1 --region $2

# + lineups api id
cd ../tickets
npm i
sls deploy --stage $1 --region $2

cd ../scanners
npm i
sls deploy --stage $1 --region $2

# + press api id
cd ../pressCategories
npm i
sls deploy --stage $1 --region $

cd ../pressArticles
npm i
sls deploy --stage $1 --region $2