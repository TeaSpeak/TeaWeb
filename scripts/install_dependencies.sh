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

install_rust() {
    rustup_version=$(rustup --version 2>/dev/null)
    if [[ $? -ne 0 ]]; then
        echo "> Missing rustup, installing..."
        curl https://build.travis-ci.org/files/rustup-init.sh -sSf | sh -s -- -y --default-toolchain nightly --default-host wasm32-unknown-unknown
        # shellcheck disable=SC2181
        [[ $? -ne 0 ]] && {
            echo "> Failed to install rustup"
            exit 1
        }

        rustup_version=$(rustup --version 2>/dev/null)
        echo "> Installed $rustup_version"
    else
        echo "> Found $rustup_version"
    fi

    echo "> Installing/updating the wasm32-unknown-unknown host"
    rustup target add wasm32-unknown-unknown
    if [[ $? -ne 0 ]]; then
        echo "> Failed to install/updating the wasm target"
        exit 1
    fi
}

install_wasmpack() {
    wasmpack_version=$(wasm-pack --version 2>/dev/null)
    if [[ $? -ne 0 ]]; then
        echo "> Missing wasm-pack, installing..."
        curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

        # shellcheck disable=SC2181
        [[ $? -ne 0 ]] && {
            echo "> Failed to install wasm-pack"
            exit 1
        }

        wasmpack_version=$(wasm-pack --version 2>/dev/null)
        echo "> Installed $wasmpack_version"
    else
        echo "> Found $wasmpack_version"
    fi
}

install_sys_deps
install_node
install_rust
install_wasmpack