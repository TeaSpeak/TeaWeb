#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR"
source ../scripts/resolve_commands.sh

if [[ ! -e declarations/imports_shared.d.ts ]]; then
    echo "generate the declarations first!"
    echo "Execute: /scripts/build_declarations.sh"
    exit 1
fi

if [[ ! -e ../shared/generated/shared.js ]]; then
    echo "generate the shared packed file first!"
    echo "Execute: /shared/generate_packed.sh"
    exit 1
fi

execute_tsc -p tsconfig/tsconfig_packed.json
if [[ $? -ne 0 ]]; then
    echo "Failed to build file"
    exit 1
fi

echo "Merging files"

if [[ -e generated/client.js ]]; then
    rm generated/client.js
fi
cat ../shared/generated/shared.js > generated/client.js
cat generated/web.js >> generated/client.js

if [[ -e generated/client.min.js ]]; then
    rm generated/client.min.js
fi

npm run minify-web-rel-file `pwd`/generated/client.min.js `pwd`/generated/client.js