#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
source "${BASEDIR}/resolve_commands.sh"

function generate_link() {
    if [ ! -L $2 ] || [ "${BASH_ARGV[0]}" == "force" ]; then
        if [ -e $2 ] || [ -L $2 ]; then
            rm $2
        fi
        ln -rs $1 $2
    fi
}

function replace_tribble() {
    #${1} => file name
    echo "$(cat ${1} | sed -E 's/\/\/\/[ ]+<reference [a-zA-Z.-=_ ]+\/>.*/\n/')" > ${1}
}
BASEDIR=$(dirname "$0")
cd "$BASEDIR/../"

#Building the generator
cd build/dtsgen
execute_tsc -p tsconfig.json
if [ $? -ne 0 ]; then
    echo "Failed to build typescript declaration generator"
    exit 1
fi
cd ../../

#Easy going: Each "module" has it's exports and imports
#So lets first build the exports and ignore any errors
#Note: For the client we have to use the given file

#Web
npm run dtsgen -- --config web/tsconfig/dtsconfig.json -v
replace_tribble web/declarations/exports.d.ts
echo "Generated web declarations"

#Shared
npm run dtsgen -- --config shared/tsconfig/dtsconfig.json -v
replace_tribble shared/declarations/exports.d.ts
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