#!/usr/bin/env bash
# Shell script to copy and rename release APK
# Usage: ./scripts/copy-release.sh [version]

set -euo pipefail

VERSION="${1:-}"

# Get version from package.json if not provided
if [ -z "$VERSION" ]; then
  if command -v node >/dev/null 2>&1; then
    VERSION="$(node -p "require('./package.json').version")"
  elif command -v python3 >/dev/null 2>&1; then
    VERSION="$(python3 -c "import json; print(json.load(open('package.json'))['version'])")"
  else
    echo "Error: version not provided and neither node nor python3 is available to read package.json" >&2
    exit 1
  fi
fi

SOURCE_PATH="android/app/build/outputs/apk/release/app-release.apk"
RELEASES_DIR="releases"
TARGET_FILE_NAME="pocketflow-v${VERSION}.apk"
TARGET_PATH="${RELEASES_DIR}/${TARGET_FILE_NAME}"

if [ ! -f "$SOURCE_PATH" ]; then
  echo "Error: Release APK not found at $SOURCE_PATH" >&2
  echo "Please build the release APK first using: ./gradlew assembleRelease" >&2
  exit 1
fi

if [ ! -d "$RELEASES_DIR" ]; then
  mkdir -p "$RELEASES_DIR"
  echo "Created releases directory"
fi

if [ -f "$TARGET_PATH" ]; then
  read -r -p "Version v${VERSION} already exists. Overwrite? (y/n) " response
  case "$response" in
    y|Y) ;;
    *)
      echo "Operation cancelled"
      exit 0
      ;;
  esac
fi

cp -f "$SOURCE_PATH" "$TARGET_PATH"
echo "[OK] Successfully copied release APK to: $TARGET_PATH"

if [ -f "$TARGET_PATH" ]; then
  if command -v stat >/dev/null 2>&1; then
    if stat --version >/dev/null 2>&1; then
      file_size_bytes="$(stat -c%s "$TARGET_PATH")"
    else
      file_size_bytes="$(stat -f%z "$TARGET_PATH")"
    fi
    file_size_mb="$(awk -v bytes="$file_size_bytes" 'BEGIN { printf "%.2f", bytes / 1024 / 1024 }')"
    echo "[OK] File size: ${file_size_mb} MB"
  else
    echo "[OK] File copied successfully"
  fi
else
  echo "[OK] File copied successfully"
fi

echo
echo "Next steps:"
echo "1. Test the APK on a device"
echo "2. Update releases/README.md with release notes"
echo "3. Commit and push to GitHub:"
echo "   git add releases/"
echo "   git commit -m 'Release v${VERSION}'"
echo "   git tag v${VERSION}"
echo "   git push origin main --tags"
