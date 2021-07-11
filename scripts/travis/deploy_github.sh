#!/usr/bin/env bash

cd "$(dirname "$0")/../../" || {
  echo "Failed to enter base dir"
  exit 1
}
source ./scripts/travis/properties.sh
source ./scripts/helper.sh

if [[ -z "${GIT_AUTHTOKEN}" ]]; then
  echo "GIT_AUTHTOKEN isn't set. Don't deploying build!"
  exit 0
fi

git_release_executable="/tmp/git-release"
install_git_release() {
  if [[ -x "${git_release_executable}" ]]; then
    # File already available. No need to install it.
    return 0
  fi

  if [[ ! -f ${git_release_executable} ]]; then
    echo "Downloading github-release-linux (1.2.4)"

    if [[ -f /tmp/git-release.gz ]]; then
      rm /tmp/git-release.gz
    fi
    wget https://github.com/tfausak/github-release/releases/download/1.2.4/github-release-linux.gz -O /tmp/git-release.gz -q
    [[ $? -eq 0 ]] || {
      echo "Failed to download github-release-linux"
      exit 1
    }

    gunzip /tmp/git-release.gz
    _exit_code=$?
    [[ $_exit_code -eq 0 ]] || {
      echo "Failed to unzip github-release-linux"
      exit 1
    }
    chmod +x /tmp/git-release

    echo "Download of github-release-linux (1.2.4) finished"
  else
    chmod +x ${git_release_executable}
  fi

  if [[ ! -x ${git_release_executable} ]]; then
    echo "git-release isn't executable"
    exit 1
  fi
}
install_git_release

git_versions_tag=$(git_version "short-tag")
echo "Deploying $git_versions_tag ($(git_version "long-tag")) to GitHub."

echo "Generating release tag"
${git_release_executable} release \
    --repo "TeaWeb" \
    --owner "TeaSpeak" \
    --token "${GIT_AUTHTOKEN}" \
    --title "Travis auto build $git_versions_tag" \
    --tag "$git_versions_tag" \
    --description "This is a auto build release from travis"

[[ $? -eq 0 ]] || {
  echo "Failed to generate git release"
  exit 1
}

upload_package() {
  local package_file
  package_file=$(find_release_package "web" "$1")
  if [[ $? -eq 0 ]]; then
    echo "Uploading $1 package ($package_file)"
    ${git_release_executable} upload \
        --repo "TeaWeb" \
        --owner "TeaSpeak" \
        --token "${GIT_AUTHTOKEN}" \
        --tag "$git_versions_tag" \
        --file "$package_file" \
        --name "$(basename "$package_file")"

    echo "Successfully uploaded $1 package"
  else
    echo "Skipping $1 package upload: $package_file"
  fi
}

# upload_package "development"
upload_package "release"
exit 0
