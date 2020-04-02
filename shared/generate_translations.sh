#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR"

#Generate the script translations
npm run ttsc -- -p $(pwd)/tsconfig/tsconfig.json
if [ $? -ne 0 ]; then
    echo "Failed to generate translation file for the script files"
    exit 1
fi

npm run trgen -- -f $(pwd)/html/templates.html -d $(pwd)/generated/messages_template.json
if [ $? -ne 0 ]; then
    echo "Failed to generate translations file for the template files"
    exit 1
fi