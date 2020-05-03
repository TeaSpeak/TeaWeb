#!/usr/bin/env bash

cd "$(dirname "$0")/../../" || { echo "Failed to enter base dir"; exit 1; }
source ./scripts/travis/properties.sh

git_rev=$(git rev-parse --short HEAD)
[[ ! "$git_rev" =~ [a-z0-9]{6} ]] && {
    echo "Failed to parse git rev. Received: '$git_rev'."
    exit 1
}

if [[ "$1" == "release" ]]; then
    echo "Releasing $git_rev as release"
    rolling_tag="latest"
elif [[ "$1" == "development" ]]; then
    echo "Releasing $git_rev as beta release"
    rolling_tag="beta"
else
    echo "Invalid release mode"
    exit 1
fi

zip_file=$(find "$PACKAGES_DIRECTORY" -maxdepth 1 -name "TeaWeb-release*.zip" -print)
[[ $(echo "$zip_file" | wc -l) -ne 1 ]] && {
    echo "Invalid .zip file count (Expected 1 but got $(echo "$zip_file" | wc -l)): ${zip_file[*]}"
    exit 1
}
[[ ! -e "$zip_file" ]] && {
    echo "File ($zip_file) does not exists"
    exit 1
}

git clone https://github.com/TeaSpeak/TeaDocker.git auto-build/teadocker || {
    echo "Failed to clone the TeaDocker project"
    exit 1
}

docker build -f auto-build/teadocker/web/travis.Dockerfile --build-arg WEB_VERSION="$git_rev" --build-arg WEB_ZIP="$zip_file" -t teaspeak/web:"$rolling_tag" auto-build/teadocker/web || {
    echo "Failed to build dockerfile"
    exit 1
}

docker tag teaspeak/web:latest teaspeak/web:"$git_rev" || {
    echo "Failed to tag docker release"
    exit 1
}

docker login -u "$DOCKERHUB_USER" -p "$DOCKERHUB_TOKEN" || {
    echo "Failed to login to docker hub"
    exit 1
}

docker push teaspeak/web || {
    echo "Failed to push new teaspeak/web tags"
    exit 1
}
docker logout # &> /dev/null

exit 0