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

        gunzip /tmp/git-release.gz; _exit_code=$?;
        [[ $_exit_code -eq 0 ]] || {
            echo "Failed to unzip github-release-linux"
            exit 1
        }
        chmod +x /tmp/git-release;

        echo "Download of github-release-linux (1.2.4) finished"
    else
        chmod +x ${GIT_RELEASE_EXECUTABLE}
    fi

    if [[ ! -x ${GIT_RELEASE_EXECUTABLE} ]]; then
        echo "git-release isn't executable"
        exit 1
    fi
fi

cd "$(dirname "$0")/../../" || { echo "Failed to enter base dir"; exit 1; }
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
folders=("${LOG_FILE}" "${PACKAGES_DIRECTORY}")
uploaded_files=()
failed_files=()

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

        [[ $? -eq 0 ]] && {
            echo "    Uploaded.";
            uploaded_files+=("$file")
        } || {
            echo "Failed to generate git release"
            failed_files+=("$file")
        }
    done
done

echo "Successfully uploaded ${#uploaded_files[@]} files. ${#failed_files[@]} uploads failed."
exit 0