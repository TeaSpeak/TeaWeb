#!/usr/bin/env bash

cd "$(dirname "$0")/../../" || { echo "Failed to enter base dir"; exit 1; }
source ./scripts/travis/properties.sh

if [[ -z "${GIT_AUTHTOKEN}" ]]; then
    echo "GIT_AUTHTOKEN isn't set. Don't deploying build!"
    exit 0
fi

GIT_COMMIT_SHORT=$(git rev-parse --short HEAD)
GIT_COMMIT_LONG=$(git rev-parse HEAD)
echo "Deploying $GIT_COMMIT_SHORT ($GIT_COMMIT_LONG) to github."

echo "Generating release"

echo "Successfully uploaded ${#uploaded_files[@]} files. ${#failed_files[@]} uploads failed."
exit 0