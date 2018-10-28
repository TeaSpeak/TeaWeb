#!/usr/bin/env bash

function generate_link() {
    if [ ! -L $2 ] || [ ${BASH_ARGV[0]} == "force" ]; then
        if [ -e $2 ]; then
            rm $2
        fi
        ln -rs $1 $2
    fi
}

BASEDIR=$(dirname "$0")
cd "$BASEDIR/../"

#Easy going: Each "module" has it's exports and imports
#So lets first build the exports and ignore any errors
#Note: For the client we have to use the given file

#Web
tsc -p web/tsconfig/tsdeclaration.json
echo "Generated web declarations"

#Shared
tsc -p shared/tsconfig/tsdeclaration.json
echo "Generated shared declarations"

#Now build the merged declaration for the shared project
#Link the declaration files (All interface declarations should be equal!)
if [ ! -d shared/declarations ]; then
    mkdir shared/declarations
    if [ $? -ne 0 ]; then
        echo "Failed to create directory shared/declarations"
        exit 1
    fi
fi
generate_link client/declarations/exports.d.ts shared/declarations/imports_client.d.ts
generate_link web/declarations/exports.d.ts shared/declarations/imports_web.d.ts


#Last but not least the client imports
generate_link shared/declarations/exports.d.ts web/declarations/imports_shared.d.ts