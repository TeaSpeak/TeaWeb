#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
source "${BASEDIR}/../scripts/resolve_commands.sh"
cd "$BASEDIR/dtsgen"

execute_tsc -p tsconfig.json
if [ $? -ne 0 ]; then
    echo "Failed to build typescript declaration generator"
    exit 1
fi

exit 0