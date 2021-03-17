#!/usr/bin/env bash

if [[ -z "$1" ]]; then
    echo "Missing deploy channel"
    exit 1
fi

cd "$(dirname "$0")/../../" || { echo "Failed to enter base dir"; exit 1; }
source ./scripts/travis/properties.sh

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

file=$(find "$PACKAGES_DIRECTORY" -maxdepth 1 -name "TeaWeb-release*.zip" -print)
[[ $(echo "$file" | wc -l) -ne 1 ]] && {
    echo "Invalid release file count (Expected 1 but got $(echo "$file" | wc -l)): ${file[*]}"
    exit 1
}
[[ ! -e "$file" ]] && {
    echo "File ($file) does not exists"
    exit 1
}
#TeaSpeak-Travis-Web
# ssh -oStrictHostKeyChecking=no $h TeaSpeak-Travis-Web@dev.web.teaspeak.de
ssh -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@web.teaspeak.dev rm "tmp-upload/*.zip" # Cleanup the old files
_exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Failed to delete the old .zip files ($_exit_code)"
}

filename="TeaWeb-release-$(git rev-parse --short HEAD).zip"
sftp -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@web.teaspeak.dev << EOF
    put $file tmp-upload/$filename
EOF
_exit_code=$?
[[ $_exit_code -ne 0 ]] && {
    echo "Failed to upload the .zip file ($_exit_code)"
    exit 1
}
ssh -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@web.teaspeak.dev "./unpack.sh $1 tmp-upload/$filename"
exit $?