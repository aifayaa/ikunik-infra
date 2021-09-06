#!/bin/bash

STAGE="$1"
REGION="$2"

usage() {
  echo "usage : ./remove.sh [STAGE] [REGION]"
  echo ""
  echo "    Remove all microservices for a STAGE deployed on a REGION"
  echo "    STAGE can be dev, preprod, prod, awax, awaxDev"
  echo "    REGION can be all AWS available regions, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions"
}

if [ -z "$STAGE" ] || [ -z "$REGION" ]; then
  echo "MISSING STAGE ($STAGE) OR REGION ($REGION) PARAMETER" 1>&2
  usage
  exit 1
fi

if ([ "$STAGE" != "dev" ] && [ "$STAGE" != "preprod" ] && [ "$STAGE" != "prod" ] && [ "$STAGE" != "awax" ] && [ "$STAGE" != "awaxDev" ]) || [ -z "$REGION" ] ; then 
  usage
  exit 1
fi

npm i
npm run install

for folder in $(tac < deployOrderList); do
  cd "$folder"
  echo "Removing $folder"
  npx sls remove --stage "$STAGE" --region "$REGION"
  cd ..
done
