#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR"
source ../scripts/resolve_commands.sh

function generate_declaration() {
    echo "Generating declarations for project $1 ($2)"

    if [[ -e ${2} ]]; then
        rm ${2}
        if [[ $? -ne 0 ]]; then
            echo "Failed to remove old declaration file ($2)!"
            echo "This could be critical later!"
        fi
    fi

    npm run dtsgen -- --config $(pwd)/tsconfig/$1 -v
    if [[ ! -e $2 ]]; then
        echo "Failed to generate definitions"
        exit 1
    fi
}

#Generate the loader definitions first
app_declaration="declarations/exports_app.d.ts"
loader_declaration_app="declarations/exports_loader_app.d.ts"
loader_declaration_certaccept="declarations/exports_loader_certaccept.d.ts"

generate_declaration dtsconfig_app.json ${app_declaration}
generate_declaration dtsconfig_loader_app.json ${loader_declaration_app}
generate_declaration dtsconfig_loader_certaccept.json ${loader_declaration_certaccept}

exit 0