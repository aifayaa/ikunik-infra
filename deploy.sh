#!/bin/bash

# no deps
cd api-v1
npm i
sls deploy --stage $1

# requires root api only
cd ../account
npm i
sls deploy --stage $1
cd ../maintenance
npm i
sls deploy --stage $1

# + authorizer
cd ../audios
npm i
sls deploy --stage $1
cd ../authorize
npm i
sls deploy --stage $1
cd ../banners
npm i
sls deploy --stage $1
cd ../blast
npm i
sls deploy --stage $1
cd ../contactLists
npm i
sls deploy --stage $1
cd ../contacts
npm i
sls deploy --stage $1
cd ../credits
npm i
sls deploy --stage $1
cd ../crowd
npm i
sls deploy --stage $1
cd ../fees
npm i
sls deploy --stage $1
cd ../festivals
npm i
sls deploy --stage $1
cd ../genres
npm i
sls deploy --stage $1
cd ../media
npm i
sls deploy --stage $1
cd ../orders
npm i
sls deploy --stage $1
cd ../payouts
npm i
sls deploy --stage $1
cd ../shop
npm i
sls deploy --stage $1
cd ../stages
npm i
sls deploy --stage $1
cd ../tokenPackages
npm i
sls deploy --stage $1
cd ../users
npm i
sls deploy --stage $1

# + users root api id
cd ../artists
npm i
sls deploy --stage $1
cd ../projects
npm i
sls deploy --stage $1
cd ../selections
npm i
sls deploy --stage $1
cd ../subscriptions
npm i
sls deploy --stage $1

# + artists api id
cd ../favorites
npm i
sls deploy --stage $1

# + festivals & stages api id
cd ../lineup
npm i
sls deploy --stage $1

# + lineups api id
cd ../tickets
npm i
sls deploy --stage $1

cd ../scanners
npm i
sls deploy --stage $1
