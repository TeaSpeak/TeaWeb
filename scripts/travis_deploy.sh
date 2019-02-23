#!/usr/bin/env bash

if [[ -z "${GIT_AUTHTOKEN}" ]]; then
    echo "Missing environment variable GIT_AUTHTOKEN. Please set it before usign this script!"
    exit 1
fi

GIT_COMMIT_SHORT=$(git rev-parse --short HEAD)
GIT_COMMIT_LONG=$(git rev-parse HEAD)
echo "Deploying $GIT_COMMIT_SHORT ($GIT_COMMIT_LONG) to github."

GIT_RELEASE_EXECUTABLE="/tmp/git-release"
if [[ ! -x ${GIT_RELEASE_EXECUTABLE} ]]; then
    if [[ ! -f ${GIT_RELEASE_EXECUTABLE} ]]; then
        echo "Downloading github-release-linux (1.2.4)"

        if [[ -f /tmp/git-release.gz ]]; then
            rm /tmp/git-release.gz
        fi
        wget https://github.com/tfausak/github-release/releases/download/1.2.4/github-release-linux.gz -O /tmp/git-release.gz -q;
        [[ $? -eq 0 ]] || {
            echo "Failed to download github-release-linux"
            exit 1
        }

        gunzip /tmp/git-release.gz && chmod +x /tmp/git-release;
        [[ $? -eq 0 ]] || {
            echo "Failed to unzip github-release-linux"
            exit 1
        }

        echo "Download of github-release-linux (1.2.4) finished"
    else
        chmod +x ${GIT_RELEASE_EXECUTABLE}
    fi

    if [[ ! -x ${GIT_RELEASE_EXECUTABLE} ]]; then
        echo "git-release isn't executable"
        exit 1
    fi
fi

echo "Generating release"
${GIT_RELEASE_EXECUTABLE} release \
	--repo "TeaWeb" \
	--owner "TeaSpeak" \
	--token "${GIT_AUTHTOKEN}" \
    --title "Travis autobuild ${GIT_COMMIT_SHORT}" \
	--tag "${GIT_COMMIT_SHORT}" \
	--description "This is a autobuild release from travis"
[[ $? -eq 0 ]] || {
    echo "Failed to generate git release"
    exit 1
}

echo "Uploading release files"
folders=("/tmp/build/logs/" "/tmp/build/packages/")
uploaded_files=()

for folder in "${folders[@]}"; do
    echo "Scanning folder $folder"
    if [[ ! -d ${folder} ]]; then
        continue;
    fi

    for file in ${folder}*; do
        if [[ -d ${file} ]]; then
            echo "  Skipping directory `basename $file` ($file)"
            continue
        fi
        echo "  Found entry `basename $file` ($file). Uploading file.";

        ${GIT_RELEASE_EXECUTABLE} upload \
            --repo "TeaWeb" \
            --owner "TeaSpeak" \
            --token "${GIT_AUTHTOKEN}" \
            --tag "${GIT_COMMIT_SHORT}" \
            --file "$file" \
            --name "`basename $file`"

        [[ $? -eq 0 ]] || {
            echo "Failed to generate git release"
            exit 1
        }

        uploaded_files+="$file"
    done
done

echo "Successfully uploaded ${#uploaded_files[@]} files."