#!/usr/bin/env bash

install_sys_deps() {
    # shellcheck disable=SC2207
    curl_version=($(curl --version 2>/dev/null))

    # shellcheck disable=SC2181
    if [[ $? -ne 0 ]]; then
        echo "> Missing curl. Please install it."
        exit 1
    fi
    echo "> Found curl ${curl_version[1]}"
}

install_node() {
    node_version=$(node --version 2>/dev/null)
    # shellcheck disable=SC2181
    if [[ $? -ne 0 ]]; then
        echo "> Missing node. We can't currently install it automatically."
        echo "> Please download the latest version here: https://nodejs.org/en/download/"
        exit 1
    else
        echo "> Found node $node_version"
    fi

    npm_version=$(npm --version 2>/dev/null)
    # shellcheck disable=SC2181
    if [[ $? -ne 0 ]]; then
        echo "> Missing npm. Please ensure you've correctly installed node."
        echo "> You may need to add npm manually to your PATH variable."
        exit 1
    else
        echo "> Found npm $npm_version"
    fi
}

install_sys_deps
install_node