#!/usr/bin/env bash
# build-appimage.sh — Build the Sanctuary desktop AppImage
# Usage: ./build-appimage.sh
#
# Fixes:
#   - Sets APPIMAGE_EXTRACT_AND_RUN=1 so linuxdeploy works without FUSE
#   - Ensures VITE_DISABLE_AUTH=true so the frontend bundles in offline/guest mode
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Building frontend with VITE_DISABLE_AUTH=true"
VITE_DISABLE_AUTH=true npm --prefix ../web run build

echo "==> Running tauri build (no bundle to skip slow beforeBuildCommand re-build)"
set +e
NO_STRIP=true APPIMAGE_EXTRACT_AND_RUN=1 npx @tauri-apps/cli@2 build --bundles appimage
TAURI_STATUS=$?
set -e

# linuxdeploy can fail while stripping system libraries on newer Linux hosts,
# even after it has created a usable AppDir. The manual pack step below is the
# supported fallback, but never continue if the AppDir was not produced.
if [ ! -d "./src-tauri/target/release/bundle/appimage/Sanctuary.AppDir" ]; then
  echo "==> Tauri failed before creating the AppDir (status $TAURI_STATUS)"
  exit "$TAURI_STATUS"
fi
if [ "$TAURI_STATUS" -ne 0 ]; then
  echo "==> Tauri/linuxdeploy returned $TAURI_STATUS; continuing with the generated AppDir"
fi

# The AppDir is already populated by tauri, we just need to pack it with appimagetool
APPDIR="$(pwd)/src-tauri/target/release/bundle/appimage/Sanctuary.AppDir"
APP_VERSION="$(sed -n 's/^version *= *"\([^"]*\)".*/\1/p' ./src-tauri/Cargo.toml | head -n 1)"
APP_VERSION="${APP_VERSION:-0.1.0}"
OUTPUT="$(pwd)/src-tauri/target/release/bundle/appimage/Sanctuary_${APP_VERSION}_amd64.AppImage"
APPIMAGETOOL="${HOME}/.cache/tauri/appimagetool-x86_64.AppImage"

# Ensure appimagetool is available
if [ ! -f "$APPIMAGETOOL" ]; then
  curl -L -o "$APPIMAGETOOL" \
    "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
  chmod +x "$APPIMAGETOOL"
fi

# Ensure icon exists at root with the name expected by the .desktop file
cp "./src-tauri/icons/128x128@2x.png" \
   "$APPDIR/sanctuary_desktop.png" 2>/dev/null || true

echo "==> Packing AppImage"
APPIMAGE_EXTRACT_AND_RUN=1 "$APPIMAGETOOL" "$APPDIR" "$OUTPUT"

echo "==> Installing to ~/Applications"
mkdir -p ~/Applications
cp "$OUTPUT" ~/Applications/Sanctuary.AppImage
chmod +x ~/Applications/Sanctuary.AppImage

echo "==> Creating .desktop launcher"
mkdir -p ~/.local/share/applications
mkdir -p ~/.local/share/icons
cp ./src-tauri/icons/128x128@2x.png ~/.local/share/icons/sanctuary.png

cat > ~/.local/share/applications/sanctuary.desktop << EOF
[Desktop Entry]
Categories=Office;Literature;
Exec=env APPIMAGE_EXTRACT_AND_RUN=1 $HOME/Applications/Sanctuary.AppImage
Icon=sanctuary
Name=Sanctuary
Type=Application
StartupWMClass=sanctuary_desktop
Terminal=false
MimeType=application/epub+zip;
EOF

echo "==> Done! Sanctuary installed to ~/Applications/Sanctuary.AppImage"
ls -lh ~/Applications/Sanctuary.AppImage
