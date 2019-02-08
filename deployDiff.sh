#!/bin/bash

fichier="folderList"

for ligne in $(<$fichier)
do
   echo "___________Deploy de $ligne ___________"
   cd $ligne
   npm i
   sls deploy --stage $1 --region $2
   cd ..
done
