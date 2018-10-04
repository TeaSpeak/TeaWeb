#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR/../"

if [ ! -d web/rel-environment ]; then
    echo "Please generate first the release environment!"
    exit 1
fi

git diff-index --quiet HEAD --
if [ $? -ne 0 ]; then
    echo "You're using a private modified build!"
    echo "Cant assign git hash!"
    NAME="TeaWeb.zip"
else
    NAME="TeaWeb-$(git rev-parse --short HEAD).zip"
fi

if [ -e ${NAME} ]; then
    echo "Deleting old file"
    rm -r ${NAME}
fi

cd web/rel-environment
zip -9 -r ${NAME} *

if [ $? -ne 0 ]; then
    echo "Failed to package environment!"
fi

mv ${NAME} ../../
cd ../../
echo "Release package successfully packaged!"
echo "Target file: ${NAME}"