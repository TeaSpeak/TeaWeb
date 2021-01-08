#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
# shellcheck disable=SC1090
source "${BASEDIR}/resolve_commands.sh"
cd "$BASEDIR/../" || { echo "Failed to enter parent directory!"; exit 1; }

#Shared
./shared/generate_declarations.sh; _exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Failed to generate shared ($_exit_code)"
}