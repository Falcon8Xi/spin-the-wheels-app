# Spin The Wheels

This is a generated Expo React Native app that wraps:

https://spinthewheels.io/

## Run Locally

```powershell
npm install
npx expo start
```

## Build Android APK/AAB

For Play Store, use the AAB. It lets Google Play deliver a smaller device-specific install. APK artifacts are mainly for direct testing and side-loading.

```powershell
npm install
npx expo install react-native-webview expo-status-bar
npx eas build -p android --profile preview
```

## Size Optimizations

- Release builds enable ProGuard and Android resource shrinking in GitHub Actions.
- APK builds are configured for common phone ABIs only: `arm64-v8a` and `armeabi-v7a`.
- AAB is recommended for Play Console because Google Play slices native libraries and resources per device.

## Build iOS

```powershell
npx eas build -p ios --profile production
```

## Notes

- The app uses `react-native-webview`.
- Android back button navigation is enabled.
- Pull-to-refresh, offline retry, media playback, cookies, and common external link schemes are enabled.
- Update `app.json` for store metadata, icons, splash screens, and extra permissions.
