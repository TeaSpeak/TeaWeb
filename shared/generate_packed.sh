#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR"
source ../scripts/resolve_commands.sh

#Generate the loader definitions first
LOADER_FILE="declarations/exports_loader.d.ts"
if [[ -e ${LOADER_FILE} ]]; then
    rm ${LOADER_FILE}
    if [[ $? -ne 0 ]]; then
        echo "Failed to remove loader file!\nThis could be critical later!"
    fi
fi
npm run dtsgen -- --config $(pwd)/tsconfig/dtsconfig_loader.json -v
if [[ ! -e ${LOADER_FILE} ]]; then
    echo "Failed to generate definitions"
    echo "$result"
    exit 1
fi

execute_ttsc -p tsconfig/tsconfig_packed.json
if [[ $? -ne 0 ]]; then
    echo "Failed to generate packed file!"
    exit 1
fi

#Now link the loader file
if [[ ! -L generated/load.js ]]; then
    rm generated/load.js 2>/dev/null
    ln -rs js/load.js generated/load.js
fi

if [[ ! -d generated/static/ ]]; then
    mkdir -p generated/static/
fi

# Create packed CSS file
find css/static/ -name '*.css' -exec cat {} \; | npm run csso -- --output `pwd`/generated/static/base.css

echo "Packed file generated!"
exit 0