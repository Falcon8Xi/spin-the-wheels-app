# Example App

This is a generated Expo React Native app that wraps:

https://example.com/

## Run Locally

```powershell
npm install
npx expo start
```

## Build Android APK/AAB

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
