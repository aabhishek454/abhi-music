# Abhi Music Android

Native Android hybrid wrapper for Abhi Music.

## Android features

- Package: `com.abhishek.abhimusic`
- Android 7.0+ (API 24)
- Native foreground playback service for licensed direct-audio tracks
- Lock-screen and notification controls
- Audio-focus handling for calls and other media
- Wake-lock protected playback
- Native file picker
- Website interface delivered from the production Vercel app

YouTube playback remains inside the official visible player. The native foreground service is used only for direct audio such as Background Mix tracks.

## Build

Set Android SDK/JDK paths and signing environment variables:

```bash
export ABHI_KEYSTORE=/secure/path/abhi-music-release.jks
export ABHI_STORE_PASSWORD='your-password'
export ABHI_KEY_PASSWORD='your-password'
gradle assembleRelease
```
