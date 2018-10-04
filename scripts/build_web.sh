#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR/../"

npm run "build-web-app"
if [ $? -ne 0 ]; then
    echo "Failed to compile app!"
    exit 0
fi

npm run "build-web-preload"
if [ $? -ne 0 ]; then
    echo "Failed to compile app-preloader!"
    exit 0
fi

php files.php generate web dev
if [ $? -ne 0 ]; then
    echo "Failed to setup environment!"
    exit 0
fi

echo "Development environment successfully generated!"
echo "Note: Do not forget to recompile the typescript files when edited!"