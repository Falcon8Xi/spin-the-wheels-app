# Spin The Wheels

[![Build Android App](https://github.com/Falcon8Xi/spin-the-wheels-app/actions/workflows/android-build.yml/badge.svg?branch=clean-app)](https://github.com/Falcon8Xi/spin-the-wheels-app/actions/workflows/android-build.yml)

This is a generated Expo React Native app that wraps:

https://spinthewheels.io/

## Download APK Or AAB

Open the Android build workflow:

https://github.com/Falcon8Xi/spin-the-wheels-app/actions/workflows/android-build.yml

Click `Run workflow`, choose `apk`, `aab`, or `both`, then click the finished workflow run and download the file from the `Artifacts` section.

For Play Store, use the AAB. It lets Google Play deliver a smaller device-specific install. APK artifacts are mainly for direct testing and side-loading.

## Size Optimizations

- Release builds enable ProGuard and Android resource shrinking.
- APK builds are configured for common phone ABIs only: `arm64-v8a` and `armeabi-v7a`.
- AAB is recommended for Play Console because Google Play slices native libraries and resources per device.

## Run Locally

```powershell
npm install
npx expo start
```

## Build Android APK/AAB

GitHub Actions is the easiest option. You can also build with Expo EAS:

```powershell
npm install
npx expo install react-native-webview expo-status-bar
npx eas build -p android --profile preview
```

## Build iOS

```powershell
npx eas build -p ios --profile production
```

## Notes

- The app uses `react-native-webview`.
- Android back button navigation is enabled.
- Pull-to-refresh, offline retry, media playback, cookies, and common external link schemes are enabled.
- Update `app.json` for store metadata, icons, splash screens, and extra permissions.
