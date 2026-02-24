import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "../../src/lib/supabase";

const BUCKET = process.env.EXPO_PUBLIC_SUPABASE_BUCKET || "photos";

type EventRow = {
  id: number;
  device_id: string;
  type: "animal" | "person";
  label: string;
  confidence: number;
  captured_at: string;
  image_path: string;
  signed_url?: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${Math.round(value * 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: 6,
  },
  fill: {
    height: "100%",
    borderRadius: 99,
  },
});

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [labelQuery, setLabelQuery] = useState("");
  const [deviceQuery, setDeviceQuery] = useState("");
  const [minConf, setMinConf] = useState("0.60");
  const [showFilters, setShowFilters] = useState(false);

  const parsedMinConf = useMemo(() => {
    const v = Number(minConf);
    if (Number.isNaN(v)) return 0.0;
    return Math.max(0, Math.min(1, v));
  }, [minConf]);

  const load = useCallback(async () => {
    const { data: events, error } = await supabase
      .from("events")
      .select("id, device_id, type, label, confidence, captured_at, image_path")
      .order("captured_at", { ascending: false })
      .limit(100);

    if (error) {
      console.log("events error", error);
      setItems([]);
      return;
    }

    const signed = await Promise.all(
      (events || []).map(async (ev) => {
        const { data, error: signErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(ev.image_path, 60 * 60);
        if (signErr) console.log("sign error", signErr);
        return { ...ev, signed_url: data?.signedUrl };
      })
    );

    setItems(signed);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const lq = labelQuery.trim().toLowerCase();
    const dq = deviceQuery.trim().toLowerCase();
    return items.filter((x) => {
      if (x.confidence < parsedMinConf) return false;
      if (lq && !x.label.toLowerCase().includes(lq)) return false;
      if (dq && !x.device_id.toLowerCase().includes(dq)) return false;
      return true;
    });
  }, [items, labelQuery, deviceQuery, parsedMinConf]);

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

  const inputStyle = [
    styles.input,
    {
      color: palette.text,
      backgroundColor: isDark ? "#1a2820" : "#f0f7f3",
      borderColor: isDark ? "#2a3d33" : "#cde0d5",
    },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: isDark ? "#1e3029" : "#dce9e1" }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.wordmark, { color: palette.tint }]}>AnimalGuard</Text>
            <Text style={[styles.subtitle, { color: palette.muted }]}>Последни засичания</Text>
          </View>
          <View style={[styles.countPill, { backgroundColor: isDark ? "#1a2820" : "#e4f3ea", borderColor: isDark ? "#2a3d33" : "#cde0d5" }]}>
            <Text style={[styles.countText, { color: palette.tint }]}>{filtered.length}</Text>
            <Text style={[styles.countSep, { color: palette.muted }]}>/</Text>
            <Text style={[styles.countTotal, { color: palette.muted }]}>{items.length}</Text>
          </View>
        </View>

        <View style={styles.filterBar}>
          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor: showFilters ? palette.tint : (isDark ? "#1a2820" : "#e4f3ea"),
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={[styles.filterBtnText, { color: showFilters ? "#fff" : palette.tint }]}>
              {showFilters ? "✕  Скрий" : "⊟  Филтри"}
            </Text>
          </Pressable>
        </View>

        {showFilters && (
          <View style={styles.filters}>
            <TextInput
              value={labelQuery}
              onChangeText={setLabelQuery}
              placeholder="Етикет (напр. куче)"
              placeholderTextColor={palette.muted}
              autoCapitalize="none"
              style={inputStyle}
            />
            <TextInput
              value={deviceQuery}
              onChangeText={setDeviceQuery}
              placeholder="Устройство (напр. icopi-001)"
              placeholderTextColor={palette.muted}
              autoCapitalize="none"
              style={inputStyle}
            />
            <TextInput
              value={minConf}
              onChangeText={setMinConf}
              placeholder="Мин. увереност (0.00 – 1.00)"
              placeholderTextColor={palette.muted}
              keyboardType="decimal-pad"
              style={inputStyle}
            />
          </View>
        )}
      </View>

      {/* ── List ── */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(x) => String(x.id)}
        refreshControl={
          <RefreshControl tintColor={palette.tint} refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item, index }) => {
          const isAnimal = item.type === "animal";
          const accent = isAnimal ? palette.success : palette.warning;
          const cardBg = isDark ? "#111d17" : "#ffffff";

          return (
            <Link
              href={{ pathname: "/event/[id]", params: { id: String(item.id) } }}
              asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  index > 0 && styles.cardGap,
                  {
                    backgroundColor: cardBg,
                    opacity: pressed ? 0.93 : 1,
                    ...Platform.select({
                      ios: {
                        shadowColor: accent,
                        shadowOpacity: isDark ? 0.25 : 0.12,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 6 },
                      },
                      android: { elevation: 4 },
                      default: {},
                    }),
                  },
                ]}>

                {/* Accent stripe */}
                <View style={[styles.accentStripe, { backgroundColor: accent }]} />

                {/* Card body */}
                <View style={styles.cardBody}>
                  {/* Left: info */}
                  <View style={styles.cardInfo}>
                    <View style={[styles.typePill, { backgroundColor: accent + "22", borderColor: accent + "55" }]}>
                      <Text style={[styles.typePillText, { color: accent }]}>
                        {isAnimal ? "🐾" : "👤"} {item.type.toUpperCase()}
                      </Text>
                    </View>

                    <Text style={[styles.cardLabel, { color: palette.text }]}>{item.label}</Text>

                    <Text style={[styles.cardMeta, { color: palette.muted }]}>
                      {item.device_id}
                    </Text>
                    <Text style={[styles.cardTime, { color: palette.muted }]}>
                      {formatTime(item.captured_at)}
                    </Text>

                    {/* Confidence */}
                    <View style={styles.confRow}>
                      <Text style={[styles.confLabel, { color: accent }]}>
                        {Math.round(item.confidence * 100)}%
                      </Text>
                      <Text style={[styles.confText, { color: palette.muted }]}> увереност</Text>
                    </View>
                    <ConfidenceBar value={item.confidence} color={accent} />
                  </View>

                  {/* Right: thumbnail */}
                  {item.signed_url ? (
                    <View style={[styles.thumb, { backgroundColor: isDark ? "#1a2820" : "#eef7f2", borderColor: accent + "44" }]}>
                      <Image
                        source={{ uri: item.signed_url }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                      {/* Overlay tag */}
                      <View style={[styles.thumbTag, { backgroundColor: accent }]}>
                        <Text style={styles.thumbTagText}>{item.label[0].toUpperCase()}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.thumb, styles.thumbNoImg, { borderColor: palette.border }]}>
                      <Text style={{ color: palette.muted, fontSize: 22 }}>📷</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </Link>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🔍</Text>
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              Няма засичания, отговарящи на филтрите.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "600" },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  wordmark: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "baseline",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 2,
  },
  countText: { fontSize: 16, fontWeight: "900" },
  countSep: { fontSize: 13, fontWeight: "500", marginHorizontal: 1 },
  countTotal: { fontSize: 13, fontWeight: "600" },

  filterBar: { flexDirection: "row" },
  filterBtn: {
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterBtnText: { fontSize: 13, fontWeight: "700" },

  filters: { gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },

  /* List */
  listContent: {
    padding: 14,
    paddingBottom: 32,
  },
  cardGap: { marginTop: 12 },

  /* Card */
  card: {
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
  },
  accentStripe: {
    width: 4,
    alignSelf: "stretch",
  },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    gap: 12,
    alignItems: "center",
  },
  cardInfo: { flex: 1, gap: 3 },

  typePill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 4,
  },
  typePillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  cardLabel: {
    fontSize: 20,
    fontWeight: "800",
    textTransform: "capitalize",
    letterSpacing: -0.3,
  },
  cardMeta: { fontSize: 12, fontWeight: "600" },
  cardTime: { fontSize: 11, fontWeight: "500" },

  confRow: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  confLabel: { fontSize: 18, fontWeight: "900" },
  confText: { fontSize: 11, fontWeight: "500" },

  /* Thumbnail */
  thumb: {
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbNoImg: { justifyContent: "center", alignItems: "center" },
  thumbTag: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbTagText: { color: "#fff", fontSize: 10, fontWeight: "900" },

  emptyContainer: { padding: 32, alignItems: "center" },
  emptyText: { fontSize: 14, fontWeight: "500", textAlign: "center" },
});