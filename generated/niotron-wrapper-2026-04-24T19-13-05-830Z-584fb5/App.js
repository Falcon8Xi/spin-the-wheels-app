import React, { useCallback, useMemo, useRef, useState } from "react";
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

const APP_NAME = "Niotron Wrapper";
const HOME_URL = "https://niotron.com/";
const PRIMARY_COLOR = "#14532d";
const BACKGROUND_COLOR = "#f8fafc";

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
