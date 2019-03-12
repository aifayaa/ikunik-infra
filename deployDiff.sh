#!/bin/bash

fichier="folderList"

for ligne in $(<$fichier)
do
   echo "___________Deploy de $ligne ___________"
   cd $ligne
   npm i
   node --max-old-space-size=2000 node_modules/serverless/bin/serverless deploy --stage $1 --region $2
   cd ..
done
