#!/bin/bash

export STAGE="$1"
export REGION="$2"

export BACKUP_EXTENSION='.bak'

folders="folderList"
doFullDeploy="$CI_FIRST_DEPLOY"

set -e

doServerless() {
  command="$1"
  npx --node-arg=--max-old-space-size=2000 serverless "$command" --stage "$STAGE" --region "$REGION"
}

doCreateDomain() {
  doServerless delete_domain
  doServerless create_domain
}

doDeploy() {
  fullDeploy="$1"
  for folder in $(<$folders)
  do
    echo "___________Deploying $folder ___________"
    if [ "$folder" != "libs" ]; then
      cd "$folder"
      npm i
      case "$folder" in
        files) npm run "deploy:$STAGE";;
        api-v1|ssr)
          if [ "$fullDeploy" = 'full' ]; then doCreateDomain; fi;
          doServerless deploy;;
        *) doServerless deploy;;
      esac
      cd ..
    fi
  done
}

if [ "$doFullDeploy" = 'true' ]; then
  cp folderList{,"$BACKUP_EXTENSION"}
  cp api-v1/serverless.yml{,"$BACKUP_EXTENSION"}

  cp deployOrderList folderList
  sedcmds='/^# remove on first deploy --- START1$/,/^# remove  when first deploy --- END1$/d'
  # Line left here as example, if needed :
  # sedcmds="$sedcmds;"'/^## uncomment on first deploy --- START1$/,/^## uncomment  when first deploy --- END1$/s/^#//'
  sed -i -e "$sedcmds" api-v1/serverless.yml

  doDeploy full

  mv folderList{"$BACKUP_EXTENSION",}
  mv api-v1/serverless.yml{"$BACKUP_EXTENSION",}

  cd api-v1
  echo "___________Re-Deploying api-v1 ___________"
  npm i
  doServerless deploy
  cd ..
else 
  doDeploy
fi

