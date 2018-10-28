#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR/../"

if [ "$1" == "development" ] || [ "$1" == "dev" ]; then
    source_path="web/environment/development"
    type="development"
elif [ "$1" == "release" ] || [ "$1" == "rel" ]; then
    source_path="web/environment/release"
    type="release"
else
    if [ $# -lt 1 ]; then
        echo "Invalid argument count!"
    else
        echo "Invalid option $1"
    fi
    echo 'Available options are: "development" or "dev", "release" or "rel"'
    exit 1
fi

if [ ! -d "$source_path" ]; then
    echo "Could not find environment! ($source_path)"
    echo "Please generate it first!"
    exit 1
fi

response=$(git diff-index HEAD -- . ':!asm/libraries/' ':!package-lock.json' ':!vendor/')
if [ "$response" != "" ]; then
    echo "You're using a private modified build!"
    echo "Cant assign git hash!"
    NAME="TeaWeb.zip"
else
    NAME="TeaWeb-$(git rev-parse --short HEAD).zip"
fi

if [ -e ${NAME} ]; then
    echo "Found old file. Deleting it."
    rm -r ${NAME}
fi

current_path=$(pwd)
cd "$source_path"
zip -9 -r ${NAME} *

if [ $? -ne 0 ]; then
    echo "Failed to package environment!"
    exit 1
fi

cd "$current_path"

mv "${source_path}/${NAME}" .
echo "Release package successfully packaged!"
echo "Target file: ${NAME}"