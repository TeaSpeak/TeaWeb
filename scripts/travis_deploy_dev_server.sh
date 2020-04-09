#!/usr/bin/env bash

PACKAGES_DIRECTORY="auto-build/packages/"
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
cd "$(dirname "$0")/.." || { echo "Failed to enter base dir"; exit 1; }

file=$(find "$PACKAGES_DIRECTORY" -maxdepth 1 -name "TeaWeb-Release*.zip" -print)
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
ssh -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@dev.web.teaspeak.de rm "tmp-upload/*.zip" # Cleanup the old files
[[ $? -ne 0 ]] && {
    echo "Failed to delete the old .zip files"
}

filename="$PACKAGES_DIRECTORY/TeaWeb-Release-$(git rev-parse --short HEAD)"
sftp -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@dev.web.teaspeak.de << EOF
    put $file tmp-upload/$filename
EOF
[[ $? -ne 0 ]] && {
    echo "Failed to upload the .zip file"
}
ssh -oStrictHostKeyChecking=no -oIdentitiesOnly=yes -i /tmp/sftp_key TeaSpeak-Travis-Web@dev.web.teaspeak.de "./unpack.sh tmp-upload/$filename"
exit $?