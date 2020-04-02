#!/bin/bash

BASEDIR=$(dirname "$0")
FILE="${BASEDIR}/../compiler.ts"

npm run dtsgen -- $@