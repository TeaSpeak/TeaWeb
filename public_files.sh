#!/usr/bin/env bash
tsc -p tsconfig/tsconfig_release.json
#uglifyjs -c --source-map --verbose -o generated/js/client.min.js generated/js/client.js
mv generated/js/client.js generated/js/client.min.js


