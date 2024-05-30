#!/bin/bash

if [ ! -d "tmp/webpackCheck/webpack" ]; then
    mkdir -p tmp/webpackCheck/webpack
else
    rm -rf tmp/webpackCheck/webpack/*
fi

# Get the list of modified files from git status
MODIFIED_FILES=$(git status --porcelain | grep '^ M' | awk '{print $2}')

# Initialize an empty array to store unique config file paths
declare -a UNIQUE_CONFIG_PATHS=()

if [ -n "$MODIFIED_FILES" ]; then
    echo "Modified files found."

    for file in $MODIFIED_FILES; do
        config_file=""
        # Find the nearest webpack.config.js file
        current_dir=$(dirname "$file")
        while [ "$current_dir" != "/"  ] && [ -z "$config_file" ]; do
            config_file=$(find "$current_dir" -maxdepth 1 -name 'webpack.config.js' | head -n 1)
            current_dir=$(dirname "$current_dir")
        done

        # If a webpack.config.js file was found and it's not already in the array, add it to the array
        if [ -n "$config_file" ]; then
            if [[ ! " ${UNIQUE_CONFIG_PATHS[@]} " =~ " ${config_file} " ]]; then
                UNIQUE_CONFIG_PATHS+=("$config_file")
                echo "$config_file"
            fi
        fi
    done
  
    # Webpack compile if modified files have been found
    for config_path in "${UNIQUE_CONFIG_PATHS[@]}"; do
        echo "Running webpack for config file: $config_path..."
        echo "$(dirname "$config_path")"
        cd "$(dirname "$config_path")" && npx sls webpack -o ../tmp/webpackCheck/webpack/ > ../tmp/webpackCheck/webpackOuput.log
        cd ..
    done

else
  echo "No modified files found."
fi

