import React, { useEffect, useState } from "react";
import { View, Text, Switch, ActivityIndicator, Alert } from "react-native";
import { supabase } from "@/src/lib/supabase";

const DEVICE_ID = "icopi-001";

type DeviceSettings = {
  device_id: string;
  guard_enabled: boolean;
  livestream_enabled: boolean;
};

export default function ExploreScreen() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("device_settings")
      .select("device_id, guard_enabled, livestream_enabled")
      .eq("device_id", DEVICE_ID)
      .single();

    if (error) {
      console.log("device_settings load error", error);
      Alert.alert("Error", "Cannot load device settings.");
      setSettings(null);
    } else {
      setSettings(data);
    }

    setLoading(false);
  }

  async function setGuardEnabled(value: boolean) {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from("device_settings")
      .update({ guard_enabled: value })
      .eq("device_id", DEVICE_ID);

    if (error) {
      console.log("update error", error);
      Alert.alert("Error", "Cannot update guard mode.");
    } else {
      setSettings({ ...settings, guard_enabled: value });
    }

    setSaving(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading settings…</Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>Settings not found for device: {DEVICE_ID}</Text>
        <Text style={{ marginTop: 8 }}>
          Add it in Supabase table: device_settings
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Settings</Text>

      <View
        style={{
          padding: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#eee",
          backgroundColor: "white",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Guard mode</Text>
        <Text style={{ opacity: 0.7, marginTop: 6 }}>
          When ON: treat person detections as security events.
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
          <Switch
            value={settings.guard_enabled}
            onValueChange={setGuardEnabled}
            disabled={saving}
          />
          <Text style={{ marginLeft: 10, fontWeight: "700" }}>
            {settings.guard_enabled ? "ARMED" : "DISARMED"}
          </Text>
        </View>
      </View>
    </View>
  );
}