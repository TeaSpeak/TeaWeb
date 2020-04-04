#!/usr/bin/env bash

# shellcheck disable=SC1090
source "$(dirname "$0")/resolve_commands.sh"
cd "$(dirname "$0")/../" || { echo "Failed to enter the base directory"; exit 1; }


if [[ $# -lt 2 ]]; then
    echo "Invalid argument count!"
    exit 1
fi

if [[ "$1" == "client" ]]; then
    build_target="client"
elif [[ "$1" == "web" ]]; then
    build_target="web"
else
    echo "Invalid option $2"
    echo 'Available options are: "web" or "client"'
    exit 1
fi

if [[ "$2" == "development" ]] || [[ "$2" == "dev" ]] || [[ "$2" == "debug" ]]; then
    build_type="development"
elif [[ "$2" == "release" ]] || [[ "$2" == "rel" ]]; then
    build_type="release"
else
    if [[ $# -lt 2 ]]; then
        echo "Invalid argument count!"
    else
        echo "Invalid option $2"
    fi
    echo 'Available options are: "development" or "dev", "release" or "rel"'
    exit 1
fi

echo "Generating required project build files"
npm run compile-project-base; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to generate project build files"
    exit 1
fi

echo "Generating required build tooks"
chmod +x ./tools/build_trgen.sh
./tools/build_trgen.sh; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to build build_typescript translation generator"
    exit 1
fi

echo "Generating style files"
npm run compile-sass; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to generate style files"
    exit 1
fi

echo "Compile vendor XBBCode"
execute_tsc -p ./vendor/xbbcode/tsconfig.json; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to build the XBBCode vendor"
    exit 1
fi

echo "Compile vendor emoji-picker"
execute_tsc ./vendor/emoji-picker/src/jquery.lsxemojipicker.ts
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to build the emoji-picker vendor"
    exit 1
fi

if [[ "$build_type" == "release" ]]; then # Compile everything for release mode
    echo "Packing generated css files"
    chmod +x ./shared/css/generate_packed.sh
    ./shared/css/generate_packed.sh; _exit_code=$?
    if [[ $_exit_code -ne 0 ]]; then
        echo "Failed to package generated css files"
        exit 1
    fi

    NODE_ENV=production npm run build-$build_target; _exit_code=$?
    if [[ $_exit_code -ne 0 ]]; then
        echo "Failed to build the $build_target applcation"
        exit 1
    fi
elif [[ "$build_type" == "development" ]]; then
    NODE_ENV=development npm run build-$build_target; _exit_code=$?
    if [[ $_exit_code -ne 0 ]]; then
        echo "Failed to build the $build_target applcation"
        exit 1
    fi
fi

echo "Generating environment"
node file.js generate $build_target ${build_type}; _exit_code=$?
if [[ $_exit_code -ne 0 ]]; then
    echo "Failed to generate environment"
    exit 1
fi

echo "$build_target builded successfully!"