#!/bin/bash

export STAGE="$1"
export REGION="$2"

export BACKUP_EXTENSION='.bak'

if [ -z "$STAGE" ] || [ -z "$REGION" ]; then
  echo "MISSING STAGE ($STAGE) OR REGION ($REGION) PARAMETER" 1>&2
  exit 1
fi

errorsFile="$PWD/errors.txt"
folders="folderList"
doFullDeploy="$CI_FIRST_DEPLOY"

set -e

addLogs() {
  sed -e "s/^/$1: /"
}

handleError() {
  folder="$1"
  echo "$folder" >>"$errorsFile"
}

doServerless() {
  command="$1"
  npx serverless "$command" --stage "$STAGE" --region "$REGION"
}

doCreateDomain() {
  doServerless delete_domain
  doServerless create_domain
}

doServerlessDomain() {
  fullDeploy="$1"
  if [ "$fullDeploy" = 'full' ]; then doCreateDomain; fi
  doServerless deploy
}

doAwaitBackgroundTasks() {
  maxJobs="$1"
  jobs >/dev/null
  while [ $(jobs | wc -l) -gt "$maxJobs" ]; do
    jobs >/dev/null
    sleep 1
  done
}

doDeploy() {
  fullDeploy="$1"
  pids=""

  for folder in $(<$folders); do
    echo "___________ Deploying $folder on $STAGE / $REGION ___________"
    cd "$folder"
    case "$folder" in
    libs) echo 'libs folder skipped' ;;
    api-v1 | ssr) (doServerlessDomain "$fullDeploy" 2>&1 || handleError "$folder") | addLogs "$folder" & ;;
    *) (doServerless deploy 2>&1 || handleError "$folder") | addLogs "$folder" & ;;
    esac

    if [ -f './serverless.yml' ]; then
      if grep -qFe '  Outputs:' serverless.yml && [ "$fullDeploy" = 'full' ]; then
        doAwaitBackgroundTasks 0
      else
        doAwaitBackgroundTasks 5
      fi
    elif [ -f './serverless.js' ]; then
      if grep -qFe '    Outputs: {' serverless.js && [ "$fullDeploy" = 'full' ]; then
        doAwaitBackgroundTasks 0
      else
        doAwaitBackgroundTasks 5
      fi
    else
      doAwaitBackgroundTasks 0
    fi

    cd ..
  done

  doAwaitBackgroundTasks 0
}

test '!' -d 'node_modules' && npm i && npm run install || true

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
  echo "___________ Re-Deploying api-v1 ___________"
  doServerless deploy
  cd ..
else
  doDeploy
fi

if [ -f "$errorsFile" ]; then
  errors=$(cat "$errorsFile")
  echo "Errors encountered when deploying, with modules :" $errors
  exit 1
fi
