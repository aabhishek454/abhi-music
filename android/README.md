# Abhi Music Android

Native Android hybrid wrapper for Abhi Music.

**Package:** `com.abhishek.abhimusic`  
**Version:** 1.8.0  
**Min Android:** 7.0 (API 24)

## Features

- Loads production site: https://abhi-music-amber.vercel.app
- Foreground media playback service (Background Mix / direct audio)
- Lock-screen + notification controls
- Audio focus, EQ presets, speed, offline mix cache
- Picture-in-Picture for YouTube video
- Home screen widget + Android Auto browse tree
- Native file picker for local music

## Download APK

1. Open **GitHub → Actions → Build APK** and wait for green
2. Or open **Releases** for `AbhiMusic-v1.8.0.apk`
3. On phone: allow install from browser/files, open the APK

## Build locally

```bash
cd android
# needs Android SDK + JDK 17
gradle assembleRelease   # or ./gradlew if wrapper jar present
# output: app/build/outputs/apk/release/app-release.apk
```

Optional release signing:

```bash
export ABHI_KEYSTORE=/path/to/abhi-music-release.jks
export ABHI_STORE_PASSWORD='…'
export ABHI_KEY_PASSWORD='…'
```
