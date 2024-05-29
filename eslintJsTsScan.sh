#!/bin/bash

# Find all JavaScript and TypeScript files in subdirectories (excluding node_modules, old_modules, and hidden directories)
# and run ESLint on them
find . -type f \( -name '*.js' -o -name '*.ts' \) -not \( -path '*/node_modules/*' -prune -o -path '*/old_modules/*' -prune -o -path '*/.*/*' -prune -o -path '*/.webpack/*' -prune \) | while read file; do
    echo "Checking $file..."
    ./node_modules/.bin/eslint "$file" >> eslintOutput.log
done
