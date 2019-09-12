#!/usr/bin/env bash

source `dirname $0`/resolve_commands.sh
BASEDIR=$(dirname "$0")
cd "$BASEDIR/../"

source_path="client-api/environment/ui-files/raw"
if [[ "$1" == "development" ]] || [[ "$1" == "dev" ]] || [[ "$1" == "debug" ]]; then
    type="development"
elif [[ "$1" == "release" ]] || [[ "$1" == "rel" ]]; then
    type="release"
else
    if [[ $# -lt 1 ]]; then
        echo "Invalid argument count!"
    else
        echo "Invalid option $1"
    fi
    echo 'Available options are: "development" or "dev", "release" or "rel"'
    exit 1
fi

echo "Generating style files"
npm run compile-sass
if [[ $? -ne 0 ]]; then
    echo "Failed to generate style files"
    exit 1
fi

echo "Generating web workers"
npm run build-worker-codec
if [[ $? -ne 0 ]]; then
    echo "Failed to build web worker codec"
    exit 1
fi
npm run build-worker-pow
if [[ $? -ne 0 ]]; then
    echo "Failed to build web worker pow"
    exit 1
fi

#Lets build some tools
#dtsgen should be already build by build_declarations.sh
./tools/build_trgen.sh
if [[ $? -ne 0 ]]; then
    echo "Failed to build typescript translation generator"
    exit 1
fi

#Now lets build the declarations
echo "Building declarations"
./scripts/build_declarations.sh force
if [[ $? -ne 0 ]]; then
    echo "Failed to generate declarations"
    exit 1
fi

if [[ "$type" == "release" ]]; then #Compile everything for release mode
    #Compile the shared source first
    echo "Building shared source"
    ./shared/generate_packed.sh
    if [[ $? -ne 0 ]]; then
        echo "Failed to build shared source"
        exit 1
    fi

    #Now compile the web client itself
    echo "Building client UI"
    ./client/generate_packed.sh
    if [[ $? -ne 0 ]]; then
        echo "Failed to build web client"
        exit 1
    fi
elif [[ "$type" == "development" ]]; then
    echo "Building shared source"
    execute_ttsc -p ./shared/tsconfig/tsconfig.json
    if [[ $? -ne 0 ]]; then
        echo "Failed to compile shared sources"
        exit 1
    fi

    echo "Building client UI source"
    execute_ttsc -p ./client/tsconfig/tsconfig.json
    if [[ $? -ne 0 ]]; then
        echo "Failed to compile web sources"
        exit 1
    fi
fi

echo "Generating environment"
php files.php generate client ${type}
if [[ $? -ne 0 ]]; then
    echo "Failed to generate environment"
    exit 1
fi

echo "Successfully build!"