#!/bin/bash

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
        REGION=$2 npm run "deploy:$1"
      else
        npm i
        npx --node-arg=--max-old-space-size=2000 serverless deploy --stage "$1" --region "$2"
      fi
      cd ..
    fi
  done
}

if [ "$doFullDeploy" = 'true' ]; then
  cp folderList{,.bak}
  cp api-vi/serverless.yml{,.bak}

  cp deployOrderList folderList
  sed -i -e '/^# remove on first deploy --- START$/,/^# remove  when first deploy --- END$/d' api-v1/serverless.yml

  doDeploy

  mv folderList{.bak,}
  mv api-vi/serverless.yml{.bak,}
fi

doDeploy
