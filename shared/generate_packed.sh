#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR"
source ../scripts/resolve_commands.sh
# The app loader
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

# The popup certaccept loader
execute_ttsc -p tsconfig/tsconfig_packed_loader_certaccept.json
if [[ $? -ne 0 ]]; then
    echo "Failed to generate packed loader file!"
    exit 1
fi

npm run minify-web-rel-file `pwd`/generated/loader_certaccept.min.js `pwd`/generated/loader_certaccept.js
if [[ $? -ne 0 ]]; then
    echo "Failed to minimize packed loader file!"
    exit 1
fi

# The main shared source
execute_ttsc -p tsconfig/tsconfig_packed.json
if [[ $? -ne 0 ]]; then
    echo "Failed to generate packed file!"
    exit 1
fi

# The certaccept source
execute_ttsc -p tsconfig/tsconfig_packed_certaccept.json
if [[ $? -ne 0 ]]; then
    echo "Failed to generate packed certaccept file!"
    exit 1
fi

npm run minify-web-rel-file `pwd`/generated/certaccept.min.js `pwd`/generated/certaccept.js
if [[ $? -ne 0 ]]; then
    echo "Failed to minimize the certaccept file!"
    exit 1
fi

# Create packed CSS file
./css/generate_packed.sh

echo "Packed file generated!"
exit 0