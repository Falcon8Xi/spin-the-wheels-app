# Web To App Builder

A local website-to-app generator. Paste any website URL, choose app metadata and permissions, then generate a complete Expo React Native project that opens the site inside a native WebView.

## Start The Builder

```powershell
npm start
```

Open:

```text
http://localhost:4173
```

## What It Generates

Each generated app is placed under `generated/<app-name-timestamp>/` and includes:

- Expo React Native project files.
- `react-native-webview` app shell.
- Android back button support.
- Loading screen, error screen, retry, and pull-to-refresh.
- Cookies, JavaScript, DOM storage, inline media playback, and common external link handling.
- Configurable Android/iOS package identifiers and native permissions.
- `eas.json` for Android APK builds.

## Run A Generated App

After generating a project:

```powershell
cd "generated\your-project-folder"
npm install
npx expo start
```

## Build An APK

```powershell
cd "generated\your-project-folder"
npm install
npx eas build -p android --profile preview
```

You need an Expo account for EAS cloud builds. For local native builds, install Android Studio, a JDK, and use:

```powershell
npx expo run:android
```

## Important Limits

This converts a website into a native WebView app. The app is fully functional when the website itself supports mobile browsers and does not block WebView traffic. Websites with strict login, payment, DRM, third-party cookie, or anti-embed policies may need custom native code or server-side changes.
