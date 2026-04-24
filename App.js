import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { WebView } from "react-native-webview";

const APP_NAME = "Spin The Wheels";
const HOME_URL = "https://spinthewheels.io/";
const PRIMARY_COLOR = "#2563eb";
const BACKGROUND_COLOR = "#f8fafc";
const HOSTNAME = "spinthewheels.io";

export default function App() {
  const webViewRef = useRef(null);
  const canGoBack = useRef(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
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

  const goHome = useCallback(() => {
    setHasError(false);
    setLoading(true);
    webViewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(HOME_URL)}; true;`);
  }, []);

  const openInBrowser = useCallback(() => {
    Linking.openURL(HOME_URL).catch(() => {
      Alert.alert("Could not open browser", "Please try again from your device browser.");
    });
  }, []);

  const shareApp = useCallback(() => {
    Share.share({
      title: APP_NAME,
      message: `${APP_NAME}: ${HOME_URL}`,
      url: HOME_URL
    }).catch(() => {});
  }, []);

  const shouldStartLoad = useCallback((request) => {
    const url = request.url || "";
    if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("whatsapp:")) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    try {
      const nextUrl = new URL(url);
      const isHttp = nextUrl.protocol === "http:" || nextUrl.protocol === "https:";
      const isAppHost = nextUrl.hostname === HOSTNAME || nextUrl.hostname.endsWith(`.${HOSTNAME}`);
      if (isHttp && !isAppHost) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
    } catch {
      return true;
    }

    return true;
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      <View style={styles.appBar}>
        <View style={styles.appTitleWrap}>
          <Text style={styles.appTitle} numberOfLines={1}>{APP_NAME}</Text>
          <Text style={styles.appSubtitle} numberOfLines={1}>{HOSTNAME}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={goHome}>
          <Text style={styles.iconText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={retry}>
          <Text style={styles.iconText}>Reload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => setAboutVisible(true)}>
          <Text style={styles.iconText}>Info</Text>
        </TouchableOpacity>
      </View>

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

      <Modal visible={aboutVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>{APP_NAME}</Text>
            <Text style={styles.modalText}>
              This app provides a mobile wrapper for {HOSTNAME} with native navigation controls, offline retry,
              sharing, and browser handoff for external links.
            </Text>
            <TouchableOpacity style={styles.modalAction} onPress={openInBrowser}>
              <Text style={styles.modalActionText}>Open Website</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalActionSecondary} onPress={shareApp}>
              <Text style={styles.modalActionSecondaryText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setAboutVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  appBar: {
    alignItems: "center",
    backgroundColor: PRIMARY_COLOR,
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  appTitleWrap: {
    flex: 1,
    minWidth: 0
  },
  appTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  appSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 10
  },
  iconText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800"
  },
  loadingOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 58,
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
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    padding: 20
  },
  modalPanel: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 20
  },
  modalTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800"
  },
  modalText: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  modalAction: {
    alignItems: "center",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    marginTop: 18,
    minHeight: 44,
    justifyContent: "center"
  },
  modalActionText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  modalActionSecondary: {
    alignItems: "center",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    minHeight: 44,
    justifyContent: "center"
  },
  modalActionSecondaryText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontWeight: "800"
  },
  modalClose: {
    alignItems: "center",
    marginTop: 14,
    minHeight: 36,
    justifyContent: "center"
  },
  modalCloseText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700"
  }
});
