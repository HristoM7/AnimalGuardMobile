import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { loadDeviceSettings, saveDeviceSettings } from "@/src/lib/settings";

const DEVICE_ID = process.env.EXPO_PUBLIC_DEVICE_ID || "icopi-001";

function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function SectionCard({ children, bg, border }: { children: React.ReactNode; bg: string; border: string }) {
  return (
    <View style={[card.wrap, { backgroundColor: bg, borderColor: border }]}>
      {children}
    </View>
  );
}
const card = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
});

function RowDivider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color }} />;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const cardBg = isDark ? "#111d17" : "#ffffff";
  const cardBorder = isDark ? "#1e3029" : "#d5e9db";
  const inputBg = isDark ? "#1a2820" : "#f0f7f3";
  const inputBorder = isDark ? "#2a3d33" : "#cde0d5";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardEnabled, setGuardEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const emailInvalid = trimmedEmail.length > 0 && !looksLikeEmail(trimmedEmail);
  const emailValid = trimmedEmail.length > 0 && looksLikeEmail(trimmedEmail);

  async function load() {
    setLoading(true);
    try {
      const s = await loadDeviceSettings(DEVICE_ID);
      setGuardEnabled(!!s.guard_enabled);
      setEmail(s.notify_email ?? "");
      setSavedEmail(s.notify_email ?? null);
    } catch (e: any) {
      console.log("settings load error", e);
      Alert.alert("Грешка", "Не успях да прочета настройките.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const toSave = trimmedEmail.length ? trimmedEmail : null;
    if (toSave && !looksLikeEmail(toSave)) {
      Alert.alert("Невалиден имейл", "Моля въведи валиден имейл (напр. name@example.com).");
      return;
    }
    setSaving(true);
    try {
      await saveDeviceSettings(DEVICE_ID, guardEnabled, toSave);
      const s = await loadDeviceSettings(DEVICE_ID);
      setGuardEnabled(!!s.guard_enabled);
      setEmail(s.notify_email ?? "");
      setSavedEmail(s.notify_email ?? null);
      Alert.alert("Записано ✅", "Настройките са запазени.");
    } catch (e: any) {
      console.log("settings save error", e);
      Alert.alert("Грешка", "Записът не мина.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: isDark ? "#1e3029" : "#dce9e1" }]}>
          <Text style={[styles.title, { color: palette.text }]}>Настройки</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>Конфигурация на устройство</Text>
        </View>

        {/* ── Device info ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.muted }]}>УСТРОЙСТВО</Text>
          <SectionCard bg={cardBg} border={cardBorder}>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>📡</Text>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: palette.muted }]}>Device ID</Text>
                <Text style={[styles.rowValueMono, { color: palette.tint }]}>{DEVICE_ID}</Text>
              </View>
            </View>
          </SectionCard>
        </View>

        {/* ── Guard mode ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.muted }]}>ОХРАНА</Text>
          <SectionCard bg={cardBg} border={cardBorder}>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>🛡️</Text>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: palette.text }]}>Guard режим</Text>
                <Text style={[styles.rowDesc, { color: palette.muted }]}>
                  При засичане на човек устройството изпраща имейл нотификация.
                </Text>
              </View>
              <Switch
                value={guardEnabled}
                onValueChange={setGuardEnabled}
                trackColor={{ false: isDark ? "#2a3d33" : "#d5e9db", true: palette.success + "88" }}
                thumbColor={guardEnabled ? palette.success : palette.muted}
              />
            </View>

            {guardEnabled && (
              <>
                <RowDivider color={cardBorder} />
                <View style={[styles.guardActiveBanner, { backgroundColor: palette.success + "14" }]}>
                  <Text style={[styles.guardActiveText, { color: palette.success }]}>
                    🟢 Guard режимът е активен
                  </Text>
                </View>
              </>
            )}
          </SectionCard>
        </View>

        {/* ── Email ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.muted }]}>НОТИФИКАЦИИ</Text>
          <SectionCard bg={cardBg} border={cardBorder}>
            <View style={[styles.emailHeader, { borderBottomColor: cardBorder }]}>
              <Text style={styles.rowIcon}>✉️</Text>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: palette.text }]}>Имейл за аларми</Text>
                <Text style={[styles.rowDesc, { color: palette.muted }]}>
                  Само когато Guard режимът е включен.
                </Text>
              </View>
            </View>

            <View style={styles.emailInputWrap}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.emailInput, {
                  color: palette.text,
                  backgroundColor: inputBg,
                  borderColor: emailInvalid ? palette.danger : emailValid ? palette.success : inputBorder,
                }]}
              />

              {emailInvalid && (
                <Text style={[styles.emailError, { color: palette.danger }]}>
                  ⚠ Невалиден имейл адрес
                </Text>
              )}

              {savedEmail && (
                <View style={styles.savedRow}>
                  <Text style={[styles.savedLabel, { color: palette.muted }]}>Записан: </Text>
                  <Text style={[styles.savedValue, { color: palette.tint }]}>{savedEmail}</Text>
                </View>
              )}
            </View>
          </SectionCard>
        </View>

        {/* ── Save button ── */}
        <View style={styles.section}>
          <Pressable
            onPress={save}
            disabled={saving || emailInvalid}
            style={({ pressed }) => [styles.saveBtn, {
              backgroundColor: saving || emailInvalid ? palette.muted : palette.tint,
              opacity: pressed ? 0.85 : 1,
            }]}>
            <Text style={styles.saveBtnText}>
              {saving ? "Записва се…" : "💾  Запази настройките"}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "600" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 4,
  },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 },

  section: { paddingHorizontal: 14, paddingTop: 20, gap: 8 },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", paddingLeft: 4 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  rowIcon: { fontSize: 20 },
  rowContent: { flex: 1, gap: 3 },
  rowLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  rowTitle: { fontSize: 15, fontWeight: "800" },
  rowDesc: { fontSize: 12, fontWeight: "500", lineHeight: 17 },
  rowValueMono: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    marginTop: 2,
  },

  guardActiveBanner: { paddingHorizontal: 14, paddingVertical: 10 },
  guardActiveText: { fontSize: 13, fontWeight: "700" },

  emailHeader: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12, borderBottomWidth: 1 },
  emailInputWrap: { padding: 14, gap: 8 },
  emailInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  emailError: { fontSize: 12, fontWeight: "700" },
  savedRow: { flexDirection: "row", alignItems: "center" },
  savedLabel: { fontSize: 12, fontWeight: "500" },
  savedValue: { fontSize: 12, fontWeight: "700" },

  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
});