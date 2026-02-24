import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/src/lib/supabase";

type DeviceStats = {
  lastSeen: string | null;
  events24h: number;
  online: boolean;
};

function StatTile({
  icon,
  label,
  value,
  valueColor,
  bg,
  borderColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor: string;
  bg: string;
  borderColor: string;
}) {
  return (
    <View style={[tile.box, { backgroundColor: bg, borderColor }]}>
      <Text style={tile.icon}>{icon}</Text>
      <Text style={[tile.value, { color: valueColor }]}>{value}</Text>
      <Text style={[tile.label, { color: valueColor + "88" }]}>{label}</Text>
    </View>
  );
}

const tile = StyleSheet.create({
  box: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  icon: { fontSize: 24 },
  value: { fontSize: 20, fontWeight: "900", letterSpacing: -0.4 },
  label: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" },
});

export default function DeviceScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [deviceId, setDeviceId] = useState("icopi-001");
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [stats, setStats] = useState<DeviceStats>({ lastSeen: null, events24h: 0, online: false });

  const loadStats = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [latestRes, countRes] = await Promise.all([
      supabase.from("events").select("captured_at").eq("device_id", deviceId)
        .order("captured_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("events").select("id", { count: "exact", head: true })
        .eq("device_id", deviceId).gte("captured_at", since),
    ]);

    if (latestRes.error) console.log("device latest error", latestRes.error);
    if (countRes.error) console.log("device count error", countRes.error);

    const lastSeen = latestRes.data?.captured_at ?? null;
    const online = !!lastSeen && Date.now() - new Date(lastSeen).getTime() <= 5 * 60 * 1000;

    setStats({ lastSeen, events24h: countRes.count ?? 0, online });
  }, [deviceId]);

  useEffect(() => {
    (async () => { setLoading(true); await loadStats(); setLoading(false); })();
  }, [loadStats]);

  const sendPing = async () => {
    try {
      setPinging(true);
      const { error } = await supabase.from("device_commands").insert({ device_id: deviceId, command: "ping", payload: {} });
      if (error) throw error;
      Alert.alert("Устройство", "Командата за проверка е изпратена.");
    } catch {
      Alert.alert("Грешка", "Неуспешно изпращане на команда.");
    } finally {
      setPinging(false);
    }
  };

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

  const statusColor = stats.online ? palette.success : palette.warning;
  const cardBg = isDark ? "#111d17" : "#ffffff";
  const cardBorder = isDark ? "#1e3029" : "#d5e9db";

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: isDark ? "#1e3029" : "#dce9e1" }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: palette.text }]}>Устройство</Text>
              <Text style={[styles.subtitle, { color: palette.muted }]}>Статус и диагностика</Text>
            </View>
            {/* Online badge */}
            <View style={[styles.statusBadge, {
              backgroundColor: statusColor + "18",
              borderColor: statusColor + "55",
            }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {stats.online ? "ОНЛАЙН" : "ОФЛАЙН"}
              </Text>
            </View>
          </View>

          <TextInput
            value={deviceId}
            onChangeText={setDeviceId}
            autoCapitalize="none"
            placeholder="ID на устройство"
            placeholderTextColor={palette.muted}
            style={[styles.deviceInput, {
              color: palette.text,
              borderColor: isDark ? "#2a3d33" : "#cde0d5",
              backgroundColor: isDark ? "#1a2820" : "#f0f7f3",
            }]}
          />
        </View>

        {/* ── Stat tiles ── */}
        <View style={styles.tilesRow}>
          <StatTile
            icon={stats.online ? "🟢" : "🟡"}
            label="Свързаност"
            value={stats.online ? "Онлайн" : "Офлайн"}
            valueColor={statusColor}
            bg={statusColor + "12"}
            borderColor={statusColor + "44"}
          />
          <StatTile
            icon="📊"
            label="Събития 24 ч."
            value={String(stats.events24h)}
            valueColor={palette.tint}
            bg={isDark ? "#111d17" : "#eaf5ef"}
            borderColor={cardBorder}
          />
        </View>

        {/* ── Last seen card ── */}
        <View style={[styles.metaCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>🕐</Text>
            <View style={styles.metaContent}>
              <Text style={[styles.metaLabel, { color: palette.muted }]}>Последно засичане</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>
                {stats.lastSeen ? new Date(stats.lastSeen).toLocaleString() : "Няма данни"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: cardBorder }]} />

          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📡</Text>
            <View style={styles.metaContent}>
              <Text style={[styles.metaLabel, { color: palette.muted }]}>Device ID</Text>
              <Text style={[styles.metaValueMono, { color: palette.tint }]}>{deviceId}</Text>
            </View>
          </View>

          {stats.lastSeen && (
            <>
              <View style={[styles.divider, { backgroundColor: cardBorder }]} />
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>⏱</Text>
                <View style={styles.metaContent}>
                  <Text style={[styles.metaLabel, { color: palette.muted }]}>Последна активност</Text>
                  <Text style={[styles.metaValue, { color: palette.text }]}>
                    {(() => {
                      const diffMs = Date.now() - new Date(stats.lastSeen!).getTime();
                      const mins = Math.floor(diffMs / 60000);
                      if (mins < 1) return "Преди по-малко от минута";
                      if (mins < 60) return `Преди ${mins} мин.`;
                      return `Преди ${Math.floor(mins / 60)} ч.`;
                    })()}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <Pressable
            onPress={loadStats}
            style={({ pressed }) => [styles.secondaryBtn, {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              opacity: pressed ? 0.8 : 1,
            }]}>
            <Text style={styles.secondaryBtnIcon}>🔄</Text>
            <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Опресни статус</Text>
          </Pressable>

          <Pressable
            disabled={pinging}
            onPress={sendPing}
            style={({ pressed }) => [styles.primaryBtn, {
              backgroundColor: palette.tint,
              opacity: pressed || pinging ? 0.8 : 1,
            }]}>
            <Text style={styles.primaryBtnIcon}>📶</Text>
            <Text style={styles.primaryBtnText}>
              {pinging ? "Изпраща…" : "Пинг към устройство"}
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
    gap: 12,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusDot: { width: 8, height: 8, borderRadius: 99 },
  statusText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },

  deviceInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: "600",
  },

  tilesRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },

  metaCard: {
    margin: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
  },
  metaIcon: { fontSize: 18, marginTop: 1 },
  metaContent: { flex: 1, gap: 3 },
  metaLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  metaValue: { fontSize: 14, fontWeight: "600" },
  metaValueMono: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  divider: { height: 1 },

  actions: { paddingHorizontal: 14, gap: 10 },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryBtnIcon: { fontSize: 16 },
  secondaryBtnText: { fontSize: 14, fontWeight: "800" },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  primaryBtnIcon: { fontSize: 16 },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
});