#!/usr/bin/env bash
npm run compile-sass
npm run build-worker
npm run build-web-app-release
npm run build-web-preload
#uglifyjs -c --source-map --verbose -o generated/js/client.min.js generated/js/client.js
cp generated/js/client.js generated/js/client.min.js


