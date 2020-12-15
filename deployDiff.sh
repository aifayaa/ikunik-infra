#!/bin/bash

export STAGE="$1"
export REGION="$2"

folders="folderList"
touch fullDeploy
doFullDeploy=$(cat fullDeploy)

set -e

doDeploy() {
  for folder in $(<$folders)
  do
    echo "___________Deploying $folder ___________"
    if [ "$folder" != "libs" ]; then
      cd "$folder"
      if [ "$folder" == "files" ]; then
        npm run "deploy:$STAGE"
      else
        npm i
        npx --node-arg=--max-old-space-size=2000 serverless deploy --stage "$STAGE" --region "$REGION"
      fi
      cd ..
    fi
  done
}

if [ "$doFullDeploy" = 'true' ]; then
  cp folderList{,.bak}
  cp api-v1/serverless.yml{,.bak}

  cp deployOrderList folderList
  sed -i -e '/^# remove on first deploy --- START$/,/^# remove  when first deploy --- END$/d' api-v1/serverless.yml

  doDeploy

  mv folderList{.bak,}
  mv api-v1/serverless.yml{.bak,}

  cd api-v1
  npx --node-arg=--max-old-space-size=2000 serverless deploy --stage "$STAGE" --region "$REGION"
  cd ..
else 
  doDeploy
fi

