#!/bin/bash

folders="folderList"

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
