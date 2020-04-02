#!/usr/bin/env bash

# Example usage: ./scripts/deploy_ui_files.sh http://dev.clientapi.teaspeak.de/api.php test 1.1.0

TMP_FILE_NAME="TeaSpeakUI.tar.gz"
TMP_DIR_NAME="tmp"

cd "$(dirname "$0")/../" || { echo "failed to enter base directory"; exit 1; }

if [[ "$#" -ne 3 ]]; then
    echo "Illegal number of parameters (url | channel | required version)"
    exit 1
fi

if [[ ! -d client-api/environment/ui-files/ ]]; then
    echo "Missing UI Files"
    exit 1
fi

# shellcheck disable=SC2154
if [[ "${teaclient_deploy_secret}" == "" ]]; then
    echo "Missing deploy secret!"
    exit 1
fi

if [[ -e "${TMP_FILE_NAME}" ]]; then
    echo "Temp file already exists!"
    echo "Deleting it!"

    if ! rm ${TMP_FILE_NAME}; then
        echo "Failed to delete file"
        exit 1
    fi
fi

GIT_HASH=$(git rev-parse --verify --short HEAD)
APPLICATION_VERSION=$(< package.json python -c "import sys, json; print(json.load(sys.stdin)['version'])")
echo "Git hash ${GIT_HASH} on version ${APPLICATION_VERSION} on channel $2"

#Packaging the app
cd client-api/environment/ui-files/ || {
  echo "Missing UI files directory"
  exit 1
}
if [[ -e ${TMP_DIR_NAME} ]]; then
    if ! rm -r ${TMP_DIR_NAME}; then
        echo "Failed to remove temporary directory!"
        exit 1
    fi
fi
cp -rL raw ${TMP_DIR_NAME}

while IFS= read -r -d '' file
do
    echo "Evaluating php file $file"
    __cur_dir=$(pwd)
    cd "$(dirname "${file}")" || { echo "Failed to enter php file directory"; exit 1; }
    php_result=$(php "$(basename "${file}")" 2> /dev/null)
    CODE=$?
    if [[ ${CODE} -ne 0 ]]; then
        echo "Failed to evaluate php file $file!"
        echo "Return code $CODE"
        exit 1
    fi

    cd "${__cur_dir}" || { echo "failed to enter original dir"; exit 1; }
    echo "${php_result}" > "${file::-4}.html"
done <   <(find "${TMP_DIR_NAME}" -name '*.php' -print0)

cd ${TMP_DIR_NAME} || { echo "failed to enter the temp dir"; exit 1; }
tar chvzf ${TMP_FILE_NAME} ./*; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to pack file ($_exit_code)"
    exit 1
fi
mv ${TMP_FILE_NAME} ../../../../
cd ../
rm -r ${TMP_DIR_NAME}
cd ../../../

RESP=$(curl \
  -k \
  -X POST \
  -F "required_client=$3" \
  -F "type=deploy-ui-build" \
  -F "channel=$2" \
  -F "version=$APPLICATION_VERSION" \
  -F "git_ref=$GIT_HASH" \
  -F "secret=${teaclient_deploy_secret}" \
  -F "file=@$(pwd)/TeaSpeakUI.tar.gz" \
   "$1"
)
echo "$RESP"
SUCCESS=$(echo "${RESP}" | python -c "import sys, json; print(json.load(sys.stdin)['success'])")

if [[ ! "${SUCCESS}" == "True" ]]; then
    ERROR=$(echo "${RESP}" | python -c "import sys, json; print(json.load(sys.stdin)['error'])" 2>/dev/null); _exit_code=$?
    if [[ $_exit_code -ne 0 ]]; then
        ERROR=$(echo "${RESP}" | python -c "import sys, json; print(json.load(sys.stdin)['msg'])" 2>/dev/null)
    fi
    echo "Failed to deploy build!"
    echo "${ERROR}"

    rm ${TMP_FILE_NAME}
    exit 1
fi

echo "Build deployed!"