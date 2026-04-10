#!/bin/bash
# Patches AndroidManifest.xml to add share intent filter for receiving images.
# Run AFTER `tauri android init` since that command regenerates the manifest.
MANIFEST="src-tauri/gen/android/app/src/main/AndroidManifest.xml"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: AndroidManifest.xml not found at $MANIFEST"
  exit 1
fi

sed -i '/<\/activity>/i \
            <intent-filter>\
                <action android:name="android.intent.action.SEND" \/>\
                <category android:name="android.intent.category.DEFAULT" \/>\
                <data android:mimeType="image\/*" \/>\
            <\/intent-filter>' "$MANIFEST"

echo "✅ Patched AndroidManifest.xml with share intent filter (image/*)"
