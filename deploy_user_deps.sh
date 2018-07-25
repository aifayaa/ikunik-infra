#!/bin/bash

# oldUserEndpointId='zuyf1o';
# newUserEndpointId='4u827d';

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -o|--old)
    oldUserEndpointId="$2"
    shift # past argument
    shift # past value
    ;;
    -n|--new)
    newUserEndpointId="$2"
    shift # past argument
    shift # past value
    ;;
    -s|--stage)
    stage="$2"
    shift # past argument
    shift # past value
    ;;
    --default)
    DEFAULT=YES
    shift # past argument
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

cd users;
cd ../subscriptions
sed -i '' "s/$oldUserEndpointId/$newUserEndpointId/g" serverless.yml
sls deploy --stage "$stage";
cd ../artists;
sed -i '' "s/$oldUserEndpointId/$newUserEndpointId/g" serverless.yml
sls deploy --stage "$stage";
cd ../projects;
sed -i '' "s/$oldUserEndpointId/$newUserEndpointId/g" serverless.yml
sls deploy --stage "$stage";
cd ..;
