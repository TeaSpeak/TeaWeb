#!/usr/bin/env bash

response=$(git diff-index HEAD -- . ':!asm/libraries/' ':!package-lock.json' ':!vendor/')
if [[ "$response" != "" ]]; then
    if [[ "$1" == "sort-tag" ]]; then
        echo "0000000"
    fi
    if [[ "$1" == "name" ]]; then
        echo "custom build"
    fi
    if [[ "$1" == "file-name" ]]; then
        echo "custom"
    fi
    exit 1
else
    if [[ "$1" == "sort-tag" ]]; then
        echo "$(git rev-parse --short HEAD)"
    fi
    if [[ "$1" == "name" ]]; then
        echo "$(git rev-parse --short HEAD)"
    fi
    if [[ "$1" == "file-name" ]]; then
        echo "$(git rev-parse --short HEAD)"
    fi
    exit 0
fi