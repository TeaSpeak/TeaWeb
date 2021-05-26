#!/usr/bin/env bash

npm run compile-tr-gen
if [ $? -ne 0 ]; then
    echo "Failed to build typescript translation generator"
    exit 1
fi
exit 0