#!/usr/bin/env bash

function execute_tsc() {
    if [ "$command_tsc" == "" ]; then
        if [ "$node_bin" == "" ]; then
            node_bin=$(npm bin)
        fi

        if [ ! -e "${node_bin}/tsc" ]; then
            echo "Could not find tsc command"
            echo "May type npm install"
            exit 1
        fi

        command_tsc="${node_bin}/tsc"

        output=$(${command_tsc} -v)
        if [ $? -ne 0 ]; then
            echo "Failed to execute a simple tsc command!"
            echo "$output"
            exit 1
        fi
    fi

    ${command_tsc} $@
}