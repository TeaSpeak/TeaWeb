#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR"
source ../scripts/resolve_commands.sh

#Generate the loader definitions first
LOADER_FILE="declarations/exports_loader_app.d.ts"
if [[ -e ${LOADER_FILE} ]]; then
    rm ${LOADER_FILE}
    if [[ $? -ne 0 ]]; then
        echo "Failed to remove loader file!\nThis could be critical later!"
    fi
fi

npm run dtsgen -- --config $(pwd)/tsconfig/dtsconfig_loader_app.json -v
if [[ ! -e ${LOADER_FILE} ]]; then
    echo "Failed to generate definitions"
    exit 1
fi

npm run dtsgen -- --config $(pwd)/tsconfig/dtsconfig_packed.json -v
if [[ $? -ne 0 ]]; then
    echo "Failed to generate definitions for the loader"
    exit 1
fi

execute_ttsc -p tsconfig/tsconfig_packed_loader_app.json
if [[ $? -ne 0 ]]; then
    echo "Failed to generate packed loader file!"
    exit 1
fi

npm run minify-web-rel-file `pwd`/generated/loader_app.min.js `pwd`/generated/loader_app.js
if [[ $? -ne 0 ]]; then
    echo "Failed to minimize packed loader file!"
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
./css/generate_packed.sh

echo "Packed file generated!"
exit 0