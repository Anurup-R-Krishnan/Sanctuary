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
npx @tauri-apps/cli@2 build --no-bundle

# The AppDir is already populated by tauri, we just need to pack it with appimagetool
APPDIR="$(pwd)/src-tauri/target/release/bundle/appimage/Sanctuary.AppDir"
OUTPUT="$(pwd)/src-tauri/target/release/bundle/appimage/Sanctuary_0.1.0_amd64.AppImage"
APPIMAGETOOL="${HOME}/.cache/tauri/appimagetool-x86_64.AppImage"

# Ensure appimagetool is available
if [ ! -f "$APPIMAGETOOL" ]; then
  curl -L -o "$APPIMAGETOOL" \
    "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
  chmod +x "$APPIMAGETOOL"
fi

# Ensure icon exists at root with the name expected by the .desktop file
cp "$APPDIR/usr/share/icons/hicolor/256x256/apps/sanctuary_desktop.png" \
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
cp ../desktop/src-tauri/icons/128x128@2x.png ~/.local/share/icons/sanctuary.png

cat > ~/.local/share/applications/sanctuary.desktop << EOF
[Desktop Entry]
Categories=Office;Literature;
Exec=env APPIMAGE_EXTRACT_AND_RUN=1 /home/anuruprkris/Applications/Sanctuary.AppImage
Icon=sanctuary
Name=Sanctuary
Type=Application
StartupWMClass=sanctuary_desktop
Terminal=false
MimeType=application/epub+zip;
EOF

echo "==> Done! Sanctuary installed to ~/Applications/Sanctuary.AppImage"
ls -lh ~/Applications/Sanctuary.AppImage
