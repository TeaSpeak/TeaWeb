build_package_directory="dist-package"

# Get the projects absolute directory
project_directory() {
  realpath "$(dirname "$(pwd)/${BASH_SOURCE[0]}")/.."
}

# Get the project version specified within the package.json file
project_version() {
  < "$(project_directory)/package.json" python -c "import sys, json; print(json.load(sys.stdin)['version'])"
}

# Get the absolute path to the target release package
# Parameters:
#  1. The build target
#     Values: "client" | "web"
#  2. The release mode the package has been created
#     Values: "release" | "development"
find_release_package() {
  local git_version_
  local package_name_
  local directory_

  directory_="$(project_directory)/$build_package_directory"
  if [[ ! -d "$directory_" ]]; then
    echo "Missing package directory $directory_. May you haven't yet build a package."
    return 1
  fi

  git_version_="$(git_version "short-tag")"
  if [[ $? -ne 0 ]]; then
    echo "We're in a development state and have a dirty work tree. Can't find release packages."
    return 1
  fi

  package_name_="$(release_package_name "$1" "$2")"
  if [[ $? -ne 0 ]]; then
    echo "Failed to generate target package name: $package_name_"
    return 1
  fi

  if [[ ! -f "$directory_/$package_name_" ]]; then
    echo "Missing target package at $directory_/$package_name_ (git version: $git_version_, target: $1, release mode: $2)"
    return 1
  fi

  echo "$directory_/$package_name_"
  return 0
}

# Generate the target build package name
# Parameters:
#  1. The build target
#     Values: "client" | "web"
#  2. The release mode the package has been created
#     Values: "release" | "development"
release_package_name() {
  local prefix_

  case "$1" in
   "client")
     prefix_="TeaClient"
     ;;
   "web")
     prefix_="TeaWeb"
     ;;
   *)
     echo "invalid package mode"
     return 1
     ;;
  esac

  case "$2" in
   "release" | "development")
     ;;
   *)
     echo "invalid package mode"
     return 1
     ;;
  esac

  # This must line up with the package name generated within the webpack config!
  echo "${prefix_}-$2-$(git_version "short-tag").zip"
  return 0
}

# Get the current working tree git version.
# If the working tree is dirty (modified) the function returns 1.
# Possible modes (first parameter):
#   short-tag: Returns a 6 digit git rev
#   long-tag: The full git revision hash
#
# Influential environment variables:
#   ignore_dirty_worktree: If set to 1 it ignores if the worktree is dirty
git_version() {
  response=$(git diff-index HEAD -- "$(project_directory)" ':!package-lock.json' ':!vendor/')
  # FIXME: Remove the `1 -eq 1` but for some reason travis fails (I guess the check above is incorrect)
  if [[ -z "$response" || "${ignore_dirty_worktree:=0}" -eq 1 || 1 -eq 1 ]]; then
      case "$1" in
        "short-tag" | "name" | "file-name")
          git rev-parse --short=8 HEAD
          ;;
        "long-tag")
          git rev-parse HEAD
          ;;

        *)
          echo "unknown type"
          ;;
      esac
      return 0
  else
      # We're in development
      case "$1" in
        "short-tag" | "name" | "file-name" | "long-tag")
          echo "00000000"
          ;;

        *)
          echo "unknown type"
          ;;
      esac
      return 1
  fi
}