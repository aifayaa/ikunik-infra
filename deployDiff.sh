#!/bin/bash

fichier="folderList"

for ligne in $(<$fichier)
do
   echo "___________Deploy de $ligne ___________"
   if [ $ligne != "libs" ]; then
         cd $ligne
      if [ $ligne == "files" ]; then
         REGION=$2 npm run deploy:$1
      else
         npm i
         node --max-old-space-size=2000 ../node_modules/serverless/bin/serverless deploy --stage $1 --region $2
      fi
      cd ..
   fi
done
