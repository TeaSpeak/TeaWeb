#!/usr/bin/env bash

function execute_tsc() {
    execute_npm_command tsc $@
}

function execute_ttsc() {
    execute_npm_command ttsc $@
}

function execute_npm_command() {
    command_name=$1
    command_variable="command_$command_name"
    #echo "Variable names $command_variable"

    if [ "${!command_variable}" == "" ]; then
        node_bin=$(npm bin)
        #echo "Node root ${node_bin}"

        if [ ! -e "${node_bin}/${command_name}" ]; then
            echo "Could not find \"$command_name\" command"
            echo "May type npm install"
            exit 1
        fi

        eval "${command_variable}=\"${node_bin}/${command_name}\""
    fi

    echo "Arguments: ${@:2}"
    ${!command_variable} ${@:2}
}