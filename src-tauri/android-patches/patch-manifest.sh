#!/bin/bash
# Patches AndroidManifest.xml to add share intent filter for receiving images.
# Also bumps minSdk to 28 (required by tauri-plugin-mobile-sharetarget).
# Run AFTER `tauri android init` since that command regenerates these files.

MANIFEST="src-tauri/gen/android/app/src/main/AndroidManifest.xml"
GRADLE="src-tauri/gen/android/app/build.gradle.kts"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: AndroidManifest.xml not found at $MANIFEST"
  exit 1
fi

# Patch manifest with share intent filter
sed -i '/<\/activity>/i \
            <intent-filter>\
                <action android:name="android.intent.action.SEND" \/>\
                <category android:name="android.intent.category.DEFAULT" \/>\
                <data android:mimeType="image\/*" \/>\
            <\/intent-filter>' "$MANIFEST"
echo "✅ Patched AndroidManifest.xml with share intent filter (image/*)"

# Bump minSdk to 28 (required by tauri-plugin-mobile-sharetarget)
if [ -f "$GRADLE" ]; then
  sed -i 's/minSdk = 24/minSdk = 28/' "$GRADLE"
  echo "✅ Bumped minSdk to 28 in build.gradle.kts"
fi
