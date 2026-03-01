import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/src/lib/supabase";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID || "icopi-001";


const STREAM_BASE = process.env.EXPO_PUBLIC_STREAM_URL || "http://10.46.160.2:8000";

function normalizeBaseUrl(url: string) {
  let u = (url || "").trim();

  while (u.endsWith("/")) u = u.slice(0, -1);

  u = u.replace(/\/stream\.mjpg$/i, "");

  while (u.endsWith("/")) u = u.slice(0, -1);

  return u;
}

export default function LiveStreamScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const cardBg = isDark ? "#111d17" : "#ffffff";
  const cardBorder = isDark ? "#1e3029" : "#d5e9db";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const baseUrl = useMemo(() => normalizeBaseUrl(STREAM_BASE), []);

  // MJPEG URL (реалният поток)
  const mjpegUrl = useMemo(() => {
    // cache-bust: сменя се при refreshToken
    return `${baseUrl}/stream.mjpg?t=${Date.now()}&k=${refreshToken}`;
  }, [baseUrl, refreshToken]);

  // HTML wrapper за WebView (най-надеждно за MJPEG на телефон)
  const mjpegHtml = useMemo(() => {
    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            html, body { margin:0; padding:0; height:100%; background:#000; overflow:hidden; }
            img { width:100%; height:100%; object-fit:contain; }
          </style>
        </head>
        <body>
          <img src="${mjpegUrl}" />
        </body>
      </html>
    `;
  }, [mjpegUrl]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("device_settings")
      .select("device_id, livestream_enabled")
      .eq("device_id", DEVICE_ID)
      .maybeSingle();

    if (error) {
      console.log("live load error", error);
      Alert.alert("Грешка", "Не успях да прочета настройките.");
      setLoading(false);
      return;
    }

    if (!data) {
      const { error: insErr } = await supabase
        .from("device_settings")
        .insert({ device_id: DEVICE_ID, livestream_enabled: false });

      if (insErr) {
        console.log("live insert error", insErr);
        Alert.alert("Грешка", "Не успях да създам настройки.");
        setLoading(false);
        return;
      }

      setLiveEnabled(false);
      setLoading(false);
      return;
    }

    setLiveEnabled(!!data.livestream_enabled);
    setLoading(false);
  }

  async function save(value: boolean) {
    setSaving(true);
    const prev = liveEnabled;
    setLiveEnabled(value);

    const { data: updatedRows, error: updErr } = await supabase
      .from("device_settings")
      .update({ livestream_enabled: value })
      .eq("device_id", DEVICE_ID)
      .select("device_id");

    if (updErr) {
      console.log("live update error", updErr);
      Alert.alert("Грешка", "Не успях да запиша livestream_enabled.");
      setLiveEnabled(prev);
      setSaving(false);
      return;
    }

    // ако няма ред -> insert (за всеки случай)
    if (!updatedRows || updatedRows.length === 0) {
      const { error: insErr } = await supabase
        .from("device_settings")
        .insert({ device_id: DEVICE_ID, livestream_enabled: value });

      if (insErr) {
        console.log("live insert-on-save error", insErr);
        Alert.alert("Грешка", "Не успях да създам запис.");
        setLiveEnabled(prev);
        setSaving(false);
        return;
      }
    }

    // ако се включва live -> презарежда стрийма веднага
    if (value) setRefreshToken((x) => x + 1);

    setSaving(false);
  }

  function doRefresh() {
    setRefreshToken((x) => x + 1);
  }

  async function onPullRefresh() {
    setRefreshing(true);
    try {
      doRefresh();
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={palette.tint} size="large" />
          <Text style={[styles.loadingText, { color: palette.muted }]}>Зарежда се…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: isDark ? "#1e3029" : "#dce9e1" }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: palette.text }]}>Стрийм</Text>
            <Text style={[styles.subtitle, { color: palette.muted }]}>Видео на живо</Text>
          </View>

          <View
            style={[
              styles.livePill,
              {
                backgroundColor: liveEnabled ? palette.danger + "22" : isDark ? "#1a2820" : "#e4f3ea",
                borderColor: liveEnabled ? palette.danger + "55" : isDark ? "#2a3d33" : "#cde0d5",
              },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: liveEnabled ? palette.danger : palette.muted }]} />
            <Text style={[styles.liveLabel, { color: liveEnabled ? palette.danger : palette.muted }]}>
              {liveEnabled ? "LIVE" : "СТОП"}
            </Text>
          </View>
        </View>

        {/* Toggle card */}
        <View style={[styles.toggleCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.toggleLeft}>
            <Text style={{ fontSize: 20 }}>📹</Text>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>Livestream</Text>
              <Text style={[styles.toggleDesc, { color: palette.muted }]}>
                {liveEnabled ? "Устройството предава на живо" : "Стриймът е изключен"}
              </Text>
            </View>
          </View>

          <Switch
            value={liveEnabled}
            onValueChange={save}
            disabled={saving}
            trackColor={{ false: isDark ? "#2a3d33" : "#d5e9db", true: palette.danger + "88" }}
            thumbColor={liveEnabled ? palette.danger : palette.muted}
          />
        </View>

        {/* Refresh row */}
        <View style={[styles.refreshRow, { borderColor: cardBorder }]}>
          <Pressable
            onPress={doRefresh}
            disabled={!liveEnabled}
            style={({ pressed }) => [
              styles.refreshBtn,
              {
                backgroundColor: liveEnabled ? palette.tint : isDark ? "#2a3d33" : "#cfe3d7",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.refreshBtnText}>⟳ Обнови стрийма</Text>
          </Pressable>

          <View style={[styles.urlRow, { backgroundColor: isDark ? "#1a2820" : "#f0f7f3", borderColor: cardBorder }]}>
            <Text style={[styles.urlLabel, { color: palette.muted }]}>Stream URL</Text>
            <Text style={[styles.urlValue, { color: palette.tint }]} numberOfLines={1}>
              {baseUrl}/stream.mjpg
            </Text>
          </View>
        </View>
      </View>

      {/* ── Stream area ── */}
      {liveEnabled ? (
        Platform.OS === "web" ? (
          <View style={styles.streamWrap}>
            <img
              src={mjpegUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: 0,
                background: "#0d1a13",
              }}
            />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onPullRefresh}
                tintColor={palette.tint}
              />
            }
          >
            <View style={styles.streamWrap}>
              <WebView
                key={String(refreshToken)}
                originWhitelist={["*"]}
                source={{ html: mjpegHtml }}
                style={{ flex: 1 }}
                javaScriptEnabled
                domStorageEnabled
                onError={(e) => console.log("WebView error", e.nativeEvent)}
              />

              <View style={[styles.streamBadge, { backgroundColor: palette.danger }]}>
                <View style={styles.streamBadgeDot} />
                <Text style={styles.streamBadgeText}>LIVE</Text>
              </View>
            </View>
          </ScrollView>
        )
      ) : (
        <View style={[styles.offPlaceholder, { backgroundColor: isDark ? "#0d1a13" : "#e8f5ee" }]}>
          <Text style={{ fontSize: 52, marginBottom: 14 }}>📵</Text>
          <Text style={[styles.offTitle, { color: palette.text }]}>Стриймът е изключен</Text>
          <Text style={[styles.offDesc, { color: palette.muted }]}>
            Включи Livestream от превключвателя горе, за да стартираш видеото.
          </Text>
          <Pressable
            onPress={() => save(true)}
            disabled={saving}
            style={({ pressed }) => [
              styles.offBtn,
              { backgroundColor: palette.tint, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.offBtnText}>▶  Пусни стрийма</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "600" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: { width: 8, height: 8, borderRadius: 99 },
  liveLabel: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },

  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  toggleLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  toggleText: { flex: 1, gap: 3 },
  toggleTitle: { fontSize: 15, fontWeight: "800" },
  toggleDesc: { fontSize: 12, fontWeight: "500" },

  refreshRow: { gap: 10, borderRadius: 16 },
  refreshBtn: { borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  refreshBtnText: { color: "#fff", fontSize: 13, fontWeight: "900" },

  urlRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
  },
  urlLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  urlValue: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },

  streamWrap: { flex: 1, minHeight: 420, position: "relative" },

  streamBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streamBadgeDot: { width: 6, height: 6, borderRadius: 99, backgroundColor: "#fff" },
  streamBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 1 },

  offPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  offTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  offDesc: { fontSize: 14, fontWeight: "500", textAlign: "center", lineHeight: 20, marginBottom: 8 },
  offBtn: { borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, marginTop: 8 },
  offBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
});