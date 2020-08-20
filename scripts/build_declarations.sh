#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
# shellcheck disable=SC1090
source "${BASEDIR}/resolve_commands.sh"
cd "$BASEDIR/../" || { echo "Failed to enter parent directory!"; exit 1; }

function generate_link() {
    if [[ ! -L $2 ]] || [[ "${BASH_ARGV[0]}" == "force" ]]; then
        if [[ -e $2 ]] || [[ -L $2 ]]; then
            rm $2
        fi
        ln -rs $1 $2
    fi
}

function replace_tribble() {
    #${1} => file name
    echo "$(cat ${1} | sed -E 's/\/\/\/[ ]+<reference [a-zA-Z.-=_ ]+\/>.*/\n/')" > ${1}
}


#Building the generator
./tools/build_dtsgen.sh; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to build typescript declaration generator ($_exit_code)"
    exit 1
fi

#Shared
./shared/generate_declarations.sh; _exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Failed to generate shared ($_exit_code)"
}