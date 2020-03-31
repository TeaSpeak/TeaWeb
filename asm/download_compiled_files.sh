#!/usr/bin/env bash

cd "$(dirname "$0")" || exit 1

if [[ -d generated/ ]]; then
    rm -r generated
    [[ $? -ne 0 ]] && {
        echo "Failed to remove old directory!"
        exit 1
    }
fi
mkdir generated
[[ $? -ne 0 ]] && {
    echo "Failed to create the 'generated' directory!"
    exit 1
}

curl --version &> /dev/null; _exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Missing CURL. Please install it"
    exit 1
}

curl https://web.teaspeak.de/wasm/TeaWeb-Worker-Codec-Opus.js --output generated/TeaWeb-Worker-Codec-Opus.js; _exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Failed to download opus worker library"
    exit 1
}
curl https://web.teaspeak.de/wasm/TeaWeb-Worker-Codec-Opus.wasm --output generated/TeaWeb-Worker-Codec-Opus.wasm; _exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Failed to download opus worker library natives"
    exit 1
}

echo "Files downloaded successfully"