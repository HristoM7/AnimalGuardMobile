import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  Switch,
  Text,
  View,
} from "react-native";
import { supabase } from "@/src/lib/supabase";

// WebView е само за native (iOS/Android). На web не го ползваме.
import { WebView } from "react-native-webview";

const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID || "icopi-001";
const STREAM_URL =
  process.env.EXPO_PUBLIC_STREAM_URL || "http://192.168.1.101:8000";

type DeviceSettings = {
  device_id: string;
  livestream_enabled: boolean;
};

export default function LiveScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(false);

  // STREAM_URL може да е различен при reload -> зависи от env
  const pageUrl = useMemo(() => `${STREAM_URL}/`, [STREAM_URL]);
  const mjpegUrl = useMemo(() => `${STREAM_URL}/stream.mjpg`, [STREAM_URL]);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("device_settings")
      .select("device_id, livestream_enabled")
      .eq("device_id", DEVICE_ID)
      .maybeSingle();

    if (error) {
      console.log("live load error", error);
      Alert.alert("Error", "Не успях да прочета device_settings.");
      setLoading(false);
      return;
    }

    // ако няма ред, създаваме го (минимален)
    if (!data) {
      const { error: insErr } = await supabase
        .from("device_settings")
        .insert({ device_id: DEVICE_ID, livestream_enabled: false });

      if (insErr) {
        console.log("live insert error", insErr);
        Alert.alert("Error", "Не успях да създам device_settings ред.");
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

    // 1) UPDATE (най-сигурно)
    const { data: updatedRows, error: updErr } = await supabase
      .from("device_settings")
      .update({ livestream_enabled: value })
      .eq("device_id", DEVICE_ID)
      .select("device_id"); // за да знаем колко реда е пипнало

    if (updErr) {
      console.log("live update error", updErr);
      Alert.alert("Error", "Не успях да запиша livestream_enabled (update).");
      setLiveEnabled(prev);
      setSaving(false);
      return;
    }

    // 2) Ако няма ред (0 реда update) -> INSERT
    if (!updatedRows || updatedRows.length === 0) {
      const { error: insErr } = await supabase
        .from("device_settings")
        .insert({ device_id: DEVICE_ID, livestream_enabled: value });

      if (insErr) {
        console.log("live insert-on-save error", insErr);
        Alert.alert("Error", "Не успях да създам device_settings ред (insert).");
        setLiveEnabled(prev);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Live</Text>

        <View
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 16,
            backgroundColor: "white",
          }}
        >
          <Text style={{ fontWeight: "700" }}>Livestream</Text>
          <Text style={{ opacity: 0.7, marginTop: 4 }}>
            ON: Raspberry трябва да пусне stream. OFF: спира.
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontWeight: "700" }}>{liveEnabled ? "ON" : "OFF"}</Text>
            <Switch value={liveEnabled} onValueChange={save} disabled={saving} />
          </View>

          <Text style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            Stream: {mjpegUrl}
          </Text>
        </View>
      </View>

      {liveEnabled ? (
        Platform.OS === "web" ? (
          // ✅ WEB: MJPEG през <img>
          <View style={{ flex: 1, padding: 12 }}>
            <img
              src={mjpegUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: 12,
                background: "black",
              }}
            />
          </View>
        ) : (
          // ✅ iOS/Android: WebView
          <WebView
            source={{ uri: pageUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
          />
        )
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Text style={{ opacity: 0.7 }}>Live е изключено.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}