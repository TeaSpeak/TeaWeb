#!/usr/bin/env bash

if [[ -z "$1" ]]; then
    echo "Missing deploy channel"
    exit 1
fi

cd "$(dirname "$0")/../../" || {
  echo "Failed to enter base dir"
  exit 1
}
source ./scripts/travis/properties.sh
source ./scripts/helper.sh

if [[ -z "${SSH_KEY}" ]]; then
    echo "Missing environment variable SSH_KEY. Please set it before using this script!"
    exit 1
fi
echo "${SSH_KEY}" | base64 --decode > /tmp/sftp_key
chmod 600 /tmp/sftp_key

[[ $? -ne 0 ]] && {
    echo "Failed to write SSH key"
    exit 1
}


package_file=$(find_release_package "web" "release")
if [[ $? -ne 0 ]]; then
    echo "$package_file"
    exit 1
fi

upload_name=$(basename "$package_file")
ssh -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@web.teaspeak.dev rm "tmp-upload/*.zip" # Cleanup the old files
_exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Failed to delete the old .zip files ($_exit_code)"
}

sftp -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@web.teaspeak.dev << EOF
    put $package_file tmp-upload/$upload_name
EOF
_exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Failed to upload the .zip file ($_exit_code)"
    exit 1
}

ssh -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@web.teaspeak.dev "./unpack.sh $1 tmp-upload/$upload_name"
exit $?