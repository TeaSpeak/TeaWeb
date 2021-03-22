#!/usr/bin/env bash

# Example usage: ./scripts/deploy_ui_files.sh http://dev.clientapi.teaspeak.de/api.php test 1.1.0

cd "$(dirname "$0")" || { echo "failed to enter base directory"; exit 1; }
source "./helper.sh"

if [[ "$#" -ne 3 ]]; then
    echo "Illegal number of parameters (url | channel | required version)"
    exit 1
fi

# shellcheck disable=SC2154
if [[ "${teaclient_deploy_secret}" == "" ]]; then
    echo "Missing deploy secret!"
    exit 1
fi

package_file=$(find_release_package "client" "release")
if [[ $? -ne 0 ]]; then
  echo "$package_file"
  exit 1
fi

# We require a .tar.gz file and not a zip file.
# So we're extracting the contents and tar.gz ing them
temp_dir=$(mktemp -d)
unzip "$package_file" -d "$temp_dir/raw/"
if [[ $? -ne 0 ]]; then
    rm -r "$temp_dir" &>/dev/null
    echo "Failed to unpack package."
    exit 1
fi

echo "Generating .tar.gz file from $package_file"
package_file="$temp_dir/$(basename -s ".zip" "$package_file").tar.gz"
tar --use-compress-program="gzip -9" -C "$temp_dir/raw/" -c . -cf "$package_file";
if [[ $? -ne 0 ]]; then
    rm -r "$temp_dir"
    echo "Failed to package package."
    exit 1
fi

git_hash=$(git_version "short-tag")
application_version=$(project_version)
echo "Deploying $package_file."
echo "Hash: ${git_hash}, Version: ${application_version}, Target channel: $2."

upload_result=$(curl \
  -k \
  -X POST \
  -F "required_client=$3" \
  -F "type=deploy-ui-build" \
  -F "channel=$2" \
  -F "version=$application_version" \
  -F "git_ref=$git_hash" \
  -F "secret=${teaclient_deploy_secret}" \
  -F "file=@$package_file" \
   "$1"
)

rm -r "$temp_dir"
echo "Server upload result: $upload_result"
success=$(echo "${upload_result}" | python -c "import sys, json; print(json.load(sys.stdin)['success'])")

if [[ ! "${success}" == "True" ]]; then
    error_message=$(echo "${upload_result}" | python -c "import sys, json; print(json.load(sys.stdin)['msg'])" 2>/dev/null);
    echo "Failed to deploy build: ${error_message}"
    exit 1
else
  echo "Build successfully deployed!"
  exit 0
fi