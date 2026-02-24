import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

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

function StatBox({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[statStyles.box, { backgroundColor: bg }]}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: color + "aa" }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  value: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  label: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
});

export default function EventDetailScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const numericId = Number(id);
      const { data, error } = await supabase
        .from("events")
        .select("id, device_id, type, label, confidence, captured_at, image_path")
        .eq("id", numericId)
        .single();

      if (error) {
        console.log("detail error", error);
        setItem(null);
        setLoading(false);
        return;
      }

      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(data.image_path, 60 * 60);

      setItem({ ...data, signed_url: signed?.signedUrl });
      setLoading(false);
    })();
  }, [id]);

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

  if (!item) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
          <Text style={[styles.notFoundText, { color: palette.muted }]}>
            Събитието не е намерено.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAnimal = item.type === "animal";
  const accent = isAnimal ? palette.success : palette.warning;
  const confPct = Math.round(item.confidence * 100);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      {/* ── Custom nav bar ── */}
      <View style={[styles.navbar, { borderBottomColor: isDark ? "#1e3029" : "#dce9e1" }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1, backgroundColor: isDark ? "#1a2820" : "#e4f3ea" }]}>
          <Text style={[styles.backText, { color: palette.tint }]}>← Назад</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: palette.text }]}>Детайли</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero image ── */}
        <View style={[styles.heroWrap, { backgroundColor: isDark ? "#0d1a13" : "#e8f5ee" }]}>
          {item.signed_url ? (
            <Image
              source={{ uri: item.signed_url }}
              style={styles.heroImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.heroNoImg}>
              <Text style={{ fontSize: 48 }}>📷</Text>
              <Text style={[styles.noImgText, { color: palette.muted }]}>Няма изображение</Text>
            </View>
          )}

          {/* Floating accent badge */}
          <View style={[styles.heroBadge, { backgroundColor: accent }]}>
            <Text style={styles.heroBadgeText}>
              {isAnimal ? "🐾" : "👤"} {item.type.toUpperCase()}
            </Text>
          </View>

          {/* Bottom accent bar */}
          <View style={[styles.heroAccentBar, { backgroundColor: accent }]} />
        </View>

        {/* ── Title row ── */}
        <View style={styles.titleRow}>
          <Text style={[styles.label, { color: palette.text }]}>{item.label}</Text>
        </View>

        {/* ── Stat boxes ── */}
        <View style={styles.statRow}>
          <StatBox
            label="Увереност"
            value={`${confPct}%`}
            color={accent}
            bg={isDark ? "#111d17" : "#eaf5ef"}
          />
          <StatBox
            label="Тип"
            value={item.type}
            color={palette.muted}
            bg={isDark ? "#111d17" : "#eaf5ef"}
          />
          <StatBox
            label="ID събитие"
            value={`#${item.id}`}
            color={palette.muted}
            bg={isDark ? "#111d17" : "#eaf5ef"}
          />
        </View>

        {/* ── Meta card ── */}
        <View style={[styles.metaCard, { backgroundColor: isDark ? "#111d17" : "#f7fdf9", borderColor: isDark ? "#1e3029" : "#d5e9db" }]}>
          <MetaRow icon="📡" label="Устройство" value={item.device_id} palette={palette} />
          <View style={[styles.divider, { backgroundColor: isDark ? "#1e3029" : "#d5e9db" }]} />
          <MetaRow icon="🕐" label="Засечено" value={new Date(item.captured_at).toLocaleString()} palette={palette} />
          <View style={[styles.divider, { backgroundColor: isDark ? "#1e3029" : "#d5e9db" }]} />
          <MetaRow icon="📁" label="Път" value={item.image_path} palette={palette} mono />
        </View>

        {/* ── Confidence bar (full) ── */}
        <View style={[styles.confCard, { backgroundColor: isDark ? "#111d17" : "#f7fdf9", borderColor: isDark ? "#1e3029" : "#d5e9db" }]}>
          <View style={styles.confHeader}>
            <Text style={[styles.confCardLabel, { color: palette.muted }]}>Ниво на увереност</Text>
            <Text style={[styles.confCardValue, { color: accent }]}>{confPct}%</Text>
          </View>
          <View style={[styles.confTrack, { backgroundColor: isDark ? "#1e3029" : "#d5e9db" }]}>
            <View style={[styles.confFill, { width: `${confPct}%` as any, backgroundColor: accent }]} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({
  icon,
  label,
  value,
  palette,
  mono = false,
}: {
  icon: string;
  label: string;
  value: string;
  palette: any;
  mono?: boolean;
}) {
  return (
    <View style={metaStyles.row}>
      <Text style={metaStyles.icon}>{icon}</Text>
      <View style={metaStyles.content}>
        <Text style={[metaStyles.label, { color: palette.muted }]}>{label}</Text>
        <Text
          style={[
            metaStyles.value,
            { color: palette.text },
            mono && metaStyles.mono,
          ]}
          numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const metaStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  icon: { fontSize: 18, marginTop: 1 },
  content: { flex: 1, gap: 2 },
  label: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  value: { fontSize: 14, fontWeight: "600" },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), fontSize: 12 },
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  notFoundText: { fontSize: 16, fontWeight: "600" },

  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: { fontSize: 13, fontWeight: "700" },
  navTitle: { fontSize: 16, fontWeight: "800" },

  content: { paddingBottom: 40 },

  /* Hero */
  heroWrap: {
    height: 300,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: { width: "100%", height: "100%" },
  heroNoImg: { alignItems: "center", gap: 8 },
  noImgText: { fontSize: 14, fontWeight: "600" },
  heroBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  heroAccentBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 5 },

  /* Title */
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  label: {
    fontSize: 32,
    fontWeight: "900",
    textTransform: "capitalize",
    letterSpacing: -0.5,
  },

  /* Stats */
  statRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
  },

  /* Meta card */
  metaCard: {
    margin: 16,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  divider: { height: 1 },

  /* Confidence card */
  confCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  confHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confCardLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  confCardValue: { fontSize: 22, fontWeight: "900" },
  confTrack: { height: 8, borderRadius: 99, overflow: "hidden" },
  confFill: { height: "100%", borderRadius: 99 },
});