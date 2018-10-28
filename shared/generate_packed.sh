#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR"

#Generate the loader definitions first
LOADER_FILE="declarations/exports_loader.d.ts"
if [ -e ${LOADER_FILE} ]; then
    rm ${LOADER_FILE}
    if [ $? -ne 0 ]; then
        echo "Failed to remove loader file!\nThis could be critical later!"
    fi
fi
tsc -p tsconfig/tsdeclaration_loader.json &> /dev/null #We dont want the output!
if [ ! -e ${LOADER_FILE} ]; then
    echo "Failed to generate definitions"
    exit 1
fi

tsc -p tsconfig/tsconfig_packed.json
if [ $? -ne 0 ]; then
    echo "Failed to generate packed file!"
    exit 1
fi

#Now link the loader file
if [ ! -L generated/load.js ]; then
    ln -rs js/load.js generated/load.js
fi

echo "Packed file generated!"
exit 0