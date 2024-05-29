#!/bin/bash

# Create output folders if they not exist
if [ ! -d "tmp/eslintCheck" ]; then
    mkdir -p tmp/eslintCheck
fi

if [ ! -d "tmp/eslintCheck/webpack" ]; then
    mkdir -p tmp/eslintCheck/webpack
else
    rm -rf tmp/eslintCheck/webpack/*
fi

# Get the list of modified files from git status
MODIFIED_FILES=$(git status --porcelain | grep '^ M' | awk '{print $2}')

# Find modified JS and TS files
JS_TS_FILES=$(echo "$MODIFIED_FILES" | grep -E '\.js$|\.ts$')

# Initialize an empty array to store unique config file paths
declare -a UNIQUE_CONFIG_PATHS=()

if [ -n "$MODIFIED_FILES" ]; then
    echo "Modified files found."

    for file in $MODIFIED_FILES; do
        # Find the nearest webpack.config.js file
        config_file=$(find "$(dirname "$file")" -name 'webpack.config.js' | head -n 1)
        if [ -z "$config_file" ]; then
            config_file=$(find "$(dirname "$file")"/.. -name 'webpack.config.js' | head -n 1)
        fi

        # If a webpack.config.js file was found and it's not already in the array, add it to the array
        if [ -n "$config_file" ]; then
            if [[ ! " ${UNIQUE_CONFIG_PATHS[@]} " =~ " ${config_file} " ]]; then
                UNIQUE_CONFIG_PATHS+=("$config_file")
                echo "$config_file"
            fi
        fi
    done

    # eslint Check if modified Js or Ts files have been found
    if [ -n "$JS_TS_FILES" ]; then
        echo "Modified JS/TS files found. Running eslint..."
        echo "$JS_TS_FILES" | xargs npx eslint > tmp/eslintCheck/eslintOutput.log
    else
        echo "No modified JS or TS files found."
    fi
  
    # Webpack compile if modified files have been found
    for config_path in "${UNIQUE_CONFIG_PATHS[@]}"; do
        echo "Running webpack for config file: $config_path..."
        echo "$(dirname "$config_path")"
        cd "$(dirname "$config_path")" && npx sls webpack -o ../tmp/eslintCheck/webpack/ > ../tmp/eslintCheck/webpackOuput.log
        cd ..
    done

else
  echo "No modified files found."
fi

