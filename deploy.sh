#!/bin/bash

# no deps
cd api-v1
sls deploy --stage $1

# requires root api only
cd ../account
sls deploy --stage $1
cd ../maintenance
sls deploy --stage $1

# + authorizer
cd ../audios
sls deploy --stage $1
cd ../authorize
sls deploy --stage $1
cd ../banners
sls deploy --stage $1
cd ../blast
sls deploy --stage $1
cd ../contactLists
sls deploy --stage $1
cd ../contacts
sls deploy --stage $1
cd ../credits
sls deploy --stage $1
cd ../crowd
sls deploy --stage $1
cd ../fees
sls deploy --stage $1
cd ../festivals
sls deploy --stage $1
cd ../genres
sls deploy --stage $1
cd ../media
sls deploy --stage $1
cd ../orders
sls deploy --stage $1
cd ../payouts
sls deploy --stage $1
cd ../shop
sls deploy --stage $1
cd ../stages
sls deploy --stage $1
cd ../tokenPackages
sls deploy --stage $1
cd ../users
sls deploy --stage $1

# + users root api id
cd ../artists
sls deploy --stage $1
cd ../projects
sls deploy --stage $1
cd ../selections
sls deploy --stage $1
cd ../subscriptions
sls deploy --stage $1

# + artists api id
cd ../favorites
sls deploy --stage $1

# + festivals & stages api id
cd ../lineup
sls deploy --stage $1
