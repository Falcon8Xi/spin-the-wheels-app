const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const generatedDir = path.join(rootDir, "generated");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data)
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function slugify(value, fallback = "webview-app") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

function toPackageId(value, fallbackName) {
  const raw = String(value || "").trim();
  if (/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(raw)) return raw;
  const slug = slugify(fallbackName, "app").replace(/-/g, "");
  return `com.webtoapp.${slug || "app"}`;
}

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Website URL is required.");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }
  return url.toString();
}

function normalizeColor(value, fallback) {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
}

function escapeJs(value) {
  return JSON.stringify(value);
}

function ensureInsideGenerated(target) {
  const resolved = path.resolve(target);
  const generatedResolved = path.resolve(generatedDir);
  if (!resolved.startsWith(generatedResolved + path.sep)) {
    throw new Error("Refusing to write outside generated directory.");
  }
}

function writeFile(projectDir, filePath, content) {
  const target = path.join(projectDir, filePath);
  ensureInsideGenerated(target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function parseHexColor(value, fallback = "#14532d") {
  const hex = normalizeColor(value, fallback).slice(1);
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    255
  ];
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makePngAsset(size, backgroundColor, accentColor) {
  const zlib = require("node:zlib");
  const bg = parseHexColor(backgroundColor);
  const accent = parseHexColor(accentColor);
  const white = [255, 255, 255, 255];
  const raw = Buffer.alloc((size * 4 + 1) * size);

  function paintPixel(x, y, color) {
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    raw[offset] = color[0];
    raw[offset + 1] = color[1];
    raw[offset + 2] = color[2];
    raw[offset + 3] = color[3];
  }

  function inRoundedRect(x, y, left, top, width, height, radius) {
    const right = left + width;
    const bottom = top + height;
    if (x < left || x >= right || y < top || y >= bottom) return false;
    const cx = x < left + radius ? left + radius : x >= right - radius ? right - radius - 1 : x;
    const cy = y < top + radius ? top + radius : y >= bottom - radius ? bottom - radius - 1 : y;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  }

  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      let color = bg;
      if (inRoundedRect(x, y, size * 0.18, size * 0.24, size * 0.64, size * 0.52, size * 0.055)) color = white;
      if (inRoundedRect(x, y, size * 0.25, size * 0.34, size * 0.5, size * 0.06, size * 0.03)) color = accent;
      if (inRoundedRect(x, y, size * 0.25, size * 0.48, size * 0.42, size * 0.045, size * 0.022)) color = accent;
      if (inRoundedRect(x, y, size * 0.25, size * 0.59, size * 0.3, size * 0.045, size * 0.022)) color = accent;
      paintPixel(x, y, color);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function appJsTemplate(config) {
  return `import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { WebView } from "react-native-webview";

const APP_NAME = ${escapeJs(config.appName)};
const HOME_URL = ${escapeJs(config.websiteUrl)};
const PRIMARY_COLOR = ${escapeJs(config.primaryColor)};
const BACKGROUND_COLOR = ${escapeJs(config.backgroundColor)};

export default function App() {
  const webViewRef = useRef(null);
  const canGoBack = useRef(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, []);

  const source = useMemo(() => ({ uri: HOME_URL }), []);

  const retry = useCallback(() => {
    setHasError(false);
    setLoading(true);
    webViewRef.current?.reload();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  const shouldStartLoad = useCallback((request) => {
    const url = request.url || "";
    if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("whatsapp:")) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    return true;
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      <WebView
        ref={webViewRef}
        source={source}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        pullToRefreshEnabled
        startInLoadingState
        setSupportMultipleWindows={false}
        originWhitelist={["http://*", "https://*", "tel:*", "mailto:*", "sms:*", "whatsapp:*"]}
        onShouldStartLoadWithRequest={shouldStartLoad}
        onLoadStart={() => {
          setLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => {
          setLoading(false);
          setRefreshing(false);
        }}
        onNavigationStateChange={(state) => {
          canGoBack.current = state.canGoBack;
        }}
        onError={() => {
          setHasError(true);
          setLoading(false);
          setRefreshing(false);
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_COLOR} />
        }
        renderError={() => (
          <View style={styles.centerPanel}>
            <Text style={styles.title}>Could not load {APP_NAME}</Text>
            <Text style={styles.message}>Check your connection, then try again.</Text>
            <TouchableOpacity style={styles.button} onPress={retry}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {loading && !hasError ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading {APP_NAME}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR
  },
  webView: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BACKGROUND_COLOR
  },
  loadingText: {
    marginTop: 14,
    color: "#1f2937",
    fontSize: 15,
    fontWeight: "600"
  },
  centerPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: BACKGROUND_COLOR
  },
  title: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center"
  },
  message: {
    color: "#4b5563",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center"
  },
  button: {
    marginTop: 22,
    minWidth: 128,
    borderRadius: 8,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  }
});
`;
}

function readmeTemplate(config) {
  return `# ${config.appName}

This is a generated Expo React Native app that wraps:

${config.websiteUrl}

## Run Locally

\`\`\`powershell
npm install
npx expo start
\`\`\`

## Build Android APK/AAB

\`\`\`powershell
npm install
npx expo install react-native-webview expo-status-bar
npx eas build -p android --profile preview
\`\`\`

## Build iOS

\`\`\`powershell
npx eas build -p ios --profile production
\`\`\`

## Notes

- The app uses \`react-native-webview\`.
- Android back button navigation is enabled.
- Pull-to-refresh, offline retry, media playback, cookies, and common external link schemes are enabled.
- Update \`app.json\` for store metadata, icons, splash screens, and extra permissions.
`;
}

function createProject(config) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const id = `${slugify(config.appName)}-${timestamp}-${crypto.randomBytes(3).toString("hex")}`;
  const projectDir = path.join(generatedDir, id);
  ensureInsideGenerated(path.join(projectDir, "x"));
  fs.mkdirSync(projectDir, { recursive: true });

  const packageJson = {
    name: slugify(config.appName),
    version: "1.0.0",
    private: true,
    main: "node_modules/expo/AppEntry.js",
    scripts: {
      start: "expo start",
      android: "expo run:android",
      ios: "expo run:ios",
      web: "expo start --web"
    },
    dependencies: {
      expo: "latest",
      "expo-status-bar": "latest",
      react: "latest",
      "react-native": "latest",
      "react-native-webview": "latest"
    },
    devDependencies: {
      "@babel/core": "latest"
    }
  };

  const permissions = [];
  if (config.permissions.camera) permissions.push("CAMERA");
  if (config.permissions.microphone) permissions.push("RECORD_AUDIO");
  if (config.permissions.location) {
    permissions.push("ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION");
  }
  if (config.permissions.storage) {
    permissions.push("READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE");
  }

  const appJson = {
    expo: {
      name: config.appName,
      slug: slugify(config.appName),
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "automatic",
      scheme: slugify(config.appName),
      splash: {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: config.backgroundColor
      },
      assetBundlePatterns: ["**/*"],
      ios: {
        supportsTablet: true,
        bundleIdentifier: config.packageId,
        infoPlist: {
          NSCameraUsageDescription: `${config.appName} needs camera access when the website requests it.`,
          NSMicrophoneUsageDescription: `${config.appName} needs microphone access when the website requests it.`,
          NSLocationWhenInUseUsageDescription: `${config.appName} needs location access when the website requests it.`
        }
      },
      android: {
        package: config.packageId,
        adaptiveIcon: {
          foregroundImage: "./assets/icon.png",
          backgroundColor: config.primaryColor
        },
        permissions
      },
      extra: {
        websiteUrl: config.websiteUrl
      }
    }
  };

  const easJson = {
    cli: {
      version: ">= 7.0.0"
    },
    build: {
      preview: {
        android: {
          buildType: "apk"
        }
      },
      production: {}
    }
  };

  writeFile(projectDir, "package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  writeFile(projectDir, "app.json", `${JSON.stringify(appJson, null, 2)}\n`);
  writeFile(projectDir, "eas.json", `${JSON.stringify(easJson, null, 2)}\n`);
  writeFile(projectDir, "babel.config.js", `module.exports = function(api) {\n  api.cache(true);\n  return { presets: ["babel-preset-expo"] };\n};\n`);
  writeFile(projectDir, "App.js", appJsTemplate(config));
  writeFile(projectDir, "README.md", readmeTemplate(config));
  writeFile(projectDir, "assets/icon.png", makePngAsset(1024, config.primaryColor, config.accentColor));
  writeFile(projectDir, "assets/splash.png", makePngAsset(1024, config.backgroundColor, config.primaryColor));

  return { id, projectDir };
}

async function handleGenerate(req, res) {
  try {
    const raw = await readBody(req);
    const input = JSON.parse(raw || "{}");
    const appName = String(input.appName || "").trim() || "WebView App";
    const websiteUrl = normalizeUrl(input.websiteUrl);
    const config = {
      appName,
      websiteUrl,
      packageId: toPackageId(input.packageId, appName),
      primaryColor: normalizeColor(input.primaryColor, "#14532d"),
      accentColor: normalizeColor(input.accentColor, "#0f766e"),
      backgroundColor: normalizeColor(input.backgroundColor, "#f8fafc"),
      permissions: {
        camera: Boolean(input.permissions?.camera),
        microphone: Boolean(input.permissions?.microphone),
        location: Boolean(input.permissions?.location),
        storage: Boolean(input.permissions?.storage)
      }
    };
    const project = createProject(config);
    sendJson(res, 201, {
      ok: true,
      projectName: path.basename(project.projectDir),
      projectPath: project.projectDir,
      runCommands: [
        `cd "${project.projectDir}"`,
        "npm install",
        "npx expo start"
      ],
      buildCommand: "npx eas build -p android --profile preview"
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
  }
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/generate") {
    handleGenerate(req, res);
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { ok: false, error: "Method not allowed" });
});

server.listen(port, () => {
  console.log(`Web-to-app builder running at http://localhost:${port}`);
});
