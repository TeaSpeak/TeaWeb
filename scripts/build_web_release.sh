#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR/../"

#Cleanup stuff
rm -r generated &> /dev/null
if [ -e generated ]; then
    echo "Failed to remove generated directory!"
    exit 1
fi

npm run "build-web-app-release"
if [ $? -ne 0 ]; then
    echo "Failed to compile app!"
    exit 0
fi

npm run "build-web-preload"
if [ $? -ne 0 ]; then
    echo "Failed to compile app-preloader!"
    exit 0
fi

php files.php generate web rel
if [ $? -ne 0 ]; then
    echo "Failed to setup environment!"
    exit 0
fi

echo "Release environment successfully generated!"