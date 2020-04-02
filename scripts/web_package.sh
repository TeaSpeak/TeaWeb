#!/usr/bin/env bash

cd "$(dirname "$0")/../" || { echo "Failed to enter base directory"; exit 1; }

if [[ "$1" == "development" ]] || [[ "$1" == "dev" ]] || [[ "$1" == "dev" ]]; then
    source_path="web/environment/development"
    type="development"
elif [[ "$1" == "release" ]] || [[ "$1" == "rel" ]]; then
    source_path="web/environment/release"
    type="release"
else
    if [[ $# -lt 1 ]]; then
        echo "Invalid argument count!"
    else
        echo "Invalid option $1"
    fi
    echo 'Available options are: "development" or "dev", "release" or "rel"'
    exit 1
fi

if [[ ! -d "$source_path" ]]; then
    echo "Could not find environment! ($source_path)"
    echo "Please generate it first!"
    exit 1
fi

response=$(git diff-index HEAD -- . ':!asm/libraries/' ':!package-lock.json' ':!vendor/')
if [[ "$response" != "" ]]; then
    echo "You're using a private modified build! Cant assign git hash!"
    NAME="TeaWeb-${type}.zip"
else
    NAME="TeaWeb-${type}-$(git rev-parse --short HEAD).zip"
fi

if [[ -e ${NAME} ]]; then
    echo "Found old file. Deleting it."
    rm -r "${NAME}"
fi

current_path=$(pwd)
cd "$source_path" || { echo "Failed to enter source path"; exit 1; }

zip -9 -r "${NAME}" ./*; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to package environment!"
    exit 1
fi

cd "$current_path" || { echo "Failed to reenter source path"; exit 1; }

mv "${source_path}/${NAME}" .
echo "Release package successfully packaged!"
echo "Target file: ${NAME} ($(pwd))"