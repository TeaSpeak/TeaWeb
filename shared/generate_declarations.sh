#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR" || { echo "Failed to enter script base dir"; exit 1; }

function generate_declaration() {
    echo "Generating declarations for project $1 ($2)"

    if [[ -d "${2}" ]]; then
        rm -r "${2}"; _exit_code=$?
        if [[ $_exit_code -ne 0 ]]; then
            echo "Failed to remove old declaration file ($2): $_exit_code!"
            echo "This could be critical later!"
        fi
    fi

    npm run tsc -- --project "$(pwd)/tsconfig/$1"
    if [[ ! -e $2 ]]; then
        echo "Failed to generate definitions"
        exit 1
    fi
}

#Generate the loader definitions first
app_declaration="../declarations/shared-app/"
generate_declaration tsconfig.declarations.json ${app_declaration}

cp -r svg-sprites "../declarations/svg-sprites"
exit 0