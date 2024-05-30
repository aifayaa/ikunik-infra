#!/bin/bash

# Create output folders if they not exist
if [ ! -d "tmp/eslintCheck" ]; then
    mkdir -p tmp/eslintCheck
fi

# Get the list of modified files from git status
MODIFIED_FILES=$(git status --porcelain | grep '^ M' | awk '{print $2}')

# Find modified JS and TS files
JS_TS_FILES=$(echo "$MODIFIED_FILES" | grep -E '\.js$|\.ts$')

# Initialize an empty array to store unique config file paths
declare -a UNIQUE_CONFIG_PATHS=()

if [ -n "$MODIFIED_FILES" ]; then
    echo "Modified files found."

    # eslint Check if modified Js or Ts files have been found
    if [ -n "$JS_TS_FILES" ]; then
        echo "Modified JS/TS files found. Running eslint..."
        echo "$JS_TS_FILES" | xargs npx eslint > tmp/eslintCheck/eslintOutput.log
    else
        echo "No modified JS or TS files found."
    fi

else
  echo "No modified files found."
fi

