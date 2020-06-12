#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR" || { echo "Failed to enter script base dir"; exit 1; }
source ../scripts/resolve_commands.sh

function generate_declaration() {
    echo "Generating declarations for project $1 ($2)"

    if [[ -d "${2}" ]]; then
        rm -r "${2}"; _exit_code=$?
        if [[ $_exit_code -ne 0 ]]; then
            echo "Failed to remove old declaration file ($2): $_exit_code!"
            echo "This could be critical later!"
        fi
    fi

    npm run dtsgen -- --config "$(pwd)/tsconfig/$1" -v
    if [[ ! -e $2 ]]; then
        echo "Failed to generate definitions"
        exit 1
    fi
}

#Generate the loader definitions first
app_declaration="../declarations/shared-app/"
generate_declaration dtsconfig_app.json ${app_declaration}
exit 0