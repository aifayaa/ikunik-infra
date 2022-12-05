#!/bin/bash

export STAGE="$1"
export REGION="$2"

export BACKUP_EXTENSION='.bak'

if [ -z "$STAGE" ] || [ -z "$REGION" ]; then
  echo "MISSING STAGE ($STAGE) OR REGION ($REGION) PARAMETER" 1>&2
  exit 1
fi

exitCode=0
pids=()
folders="folderList"
doFullDeploy="$CI_FIRST_DEPLOY"

set -e

addLogs() {
  sed -e "s/^/$1: /"
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
  jobs > /dev/null
  while [ $(jobs | wc -l) -gt "$maxJobs" ]; do
    jobs > /dev/null
    sleep 1
  done
}

doDeploy() {
  fullDeploy="$1"
  for folder in $(<$folders)
  do
    echo "___________ Deploying $folder on $STAGE / $REGION ___________"
    cd "$folder"
    case "$folder" in
      libs) echo 'libs folder skipped';;
      ssr)
        doServerlessDomain "$fullDeploy" 2>&1 | addLogs "$folder" &
        pids+=("$!");;
      api-v1)
        doServerlessDomain "$fullDeploy" 2>&1 | addLogs "$folder" &
        pids+=("$!");;
      *)
        doServerless deploy 2>&1 | addLogs "$folder" &
        pids+=("$!");;
    esac

    if grep -qFe '  Outputs:' serverless.yml && [ "$fullDeploy" = 'full' ]; then
      doAwaitBackgroundTasks 0
    else
      doAwaitBackgroundTasks 10
    fi
    cd ..
  done

  doAwaitBackgroundTasks 0

  while [ ${#pids[@]} -gt 0 ]; do
    wait "${pids[0]}"
    code=$?
    unset pids[0]
    if [ "$code" -ne 0 ]; then
      exitCode=1
    fi
  done
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

exit $exitCode
