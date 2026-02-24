import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  Switch,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";

import { loadDeviceSettings, saveDeviceSettings } from "@/src/lib/settings";

const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID || "icopi-001";

// супер проста валидация (не е перфектна, но върши работа за MVP)
function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [guardEnabled, setGuardEnabled] = useState(false);
  const [email, setEmail] = useState("");

  // за да покажем какво реално е записано в БД
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  async function load() {
    setLoading(true);
    try {
      const s = await loadDeviceSettings(DEVICE_ID);
      setGuardEnabled(!!s.guard_enabled);
      setEmail(s.notify_email ?? "");
      setSavedEmail(s.notify_email ?? null);
    } catch (e: any) {
      console.log("settings load error", e);
      Alert.alert("Error", "Не успях да прочета device_settings. Виж конзолата.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const toSave = trimmedEmail.length ? trimmedEmail : null;

    // ако има текст, но не прилича на имейл -> стоп (за да не записваме боклук)
    if (toSave && !looksLikeEmail(toSave)) {
      Alert.alert("Invalid email", "Моля въведи валиден имейл (пример: name@example.com).");
      return;
    }

    setSaving(true);
    try {
      await saveDeviceSettings(DEVICE_ID, guardEnabled, toSave);

      // важно: презареждаме от БД, за да сме 100% сигурни какво е записано
      const s = await loadDeviceSettings(DEVICE_ID);
      setGuardEnabled(!!s.guard_enabled);
      setEmail(s.notify_email ?? "");
      setSavedEmail(s.notify_email ?? null);

      Alert.alert("Saved ✅", "Настройките са записани.");
    } catch (e: any) {
      console.log("settings save error", e);
      Alert.alert("Error", "Записът не мина. Виж конзолата.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading settings…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "800" }}>Settings</Text>

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 16,
          backgroundColor: "white",
        }}
      >
        <Text style={{ fontWeight: "700" }}>Device</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>{DEVICE_ID}</Text>
      </View>

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 16,
          backgroundColor: "white",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontWeight: "700" }}>Guard mode</Text>
            <Text style={{ opacity: 0.7, marginTop: 4 }}>
              Ако е ON и се засече човек, Raspberry ще изпрати нотификация по имейл.
            </Text>
          </View>
          <Switch value={guardEnabled} onValueChange={setGuardEnabled} />
        </View>
      </View>

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 16,
          backgroundColor: "white",
        }}
      >
        <Text style={{ fontWeight: "700" }}>Notify email</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          На този имейл ще се праща аларма при човек (само когато Guard mode е ON).
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />

        <Text style={{ marginTop: 8, opacity: 0.7 }}>
          Saved as:{" "}
          <Text style={{ fontWeight: "700" }}>
            {savedEmail ?? "null"}
          </Text>
        </Text>

        {trimmedEmail.length > 0 && !looksLikeEmail(trimmedEmail) ? (
          <Text style={{ marginTop: 6, color: "tomato" }}>
            Това не прилича на валиден имейл.
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        style={{
          backgroundColor: saving ? "#999" : "black",
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>
          {saving ? "Saving…" : "Save"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}