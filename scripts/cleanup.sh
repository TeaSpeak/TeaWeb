#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
cd "$BASEDIR/../"

# This script cleanups all generated files
function remove_if_exists() {
    if [[ -f "$1" ]] || [[ -d "$1" ]]; then
        echo "Deleting $1"
        rm -r "$1"
    fi
}

function cleanup_declarations() {
    remove_if_exists shared/declarations/
    remove_if_exists web/declarations/
}

function cleanup_generated_files() {
    remove_if_exists shared/generated
    remove_if_exists web/generated
}

# Parameters
# $1 := Path
# $2 := Pattern
# $3 := Display Name
function cleanup_files() {
    echo "Resolving $3 files in $1"
    #Requires at least bash4.4
    readarray -d '' files < <(find "$1" -name "$2" -print0)

    echo "Deleting $3 files in $1"
    for file in "${files[@]}"
    do :
        echo " - $file"
        rm ${file}
    done
}

if [[ "$1" == "full" ]]; then
    echo "Full cleanup. Deleting generated javascript and css files"
    cleanup_files "shared/js" "*.js" "JavaScript"
    cleanup_files "shared/js" "*.js.map" "JavaScript-Mapping"
    cleanup_files "shared/css/static/" "*.css" "CSS" # We only use SCSS, not CSS
    cleanup_files "shared/css/static/" "*.css.map" "CSS-Mapping"

    cleanup_files "web/js" "*.js" "JavaScript"
    cleanup_files "web/js" "*.js.map" "JavaScript-Mapping"

    cleanup_files "client/js" "*.js" "JavaScript"
    cleanup_files "client/js" "*.js.map" "JavaScript-Mapping"
    echo "Removed all generated js files"
fi
echo "Deleting declarations"
cleanup_declarations

echo "Deleting generated output files"
cleanup_generated_files

echo "Project cleaned up"