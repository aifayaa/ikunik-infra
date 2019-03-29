#!/bin/bash

fichier="folderList"

for ligne in $(<$fichier)
do
   echo "___________Deploy de $ligne ___________"
   if [ $ligne != "libs" ]; then
      cd $ligne
      npm i
      node --max-old-space-size=2000 ../node_modules/serverless/bin/serverless deploy --stage $1 --region $2
      cd ..
   fi
done
