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

cleanup_declarations
cleanup_generated_files