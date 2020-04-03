#!/usr/bin/env bash

cd "$(dirname "$0")" || { echo "Failed to enter base directory"; exit 1; }

npm run trgen -- -f "$(pwd)/html/templates.html" -f "$(pwd)/html/templates/modal/newcomer.html" -f "$(pwd)/html/templates/modal/musicmanage.html" -d "$(pwd)/generated/translations_html.json"; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to generate translations file for the template files"
    exit 1
fi