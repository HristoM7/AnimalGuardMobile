import { supabase } from "@/src/lib/supabase";

export type DeviceSettings = {
  device_id: string;
  guard_enabled: boolean;
  notify_email: string | null;
};

/**
 * Loads settings for a device.
 * If no row exists yet, returns defaults (row will be created on Save).
 */
export async function loadDeviceSettings(deviceId: string): Promise<DeviceSettings> {
  const { data, error } = await supabase
    .from("device_settings")
    .select("device_id, guard_enabled, notify_email")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) throw error;

  // No row yet -> defaults
  if (!data) {
    return {
      device_id: deviceId,
      guard_enabled: false,
      notify_email: null,
    };
  }

  return data as DeviceSettings;
}

/**
 * Saves (upserts) device settings.
 * Works even if the row doesn't exist yet.
 */
export async function saveDeviceSettings(
  deviceId: string,
  guardEnabled: boolean,
  notifyEmail: string | null
): Promise<void> {
  const email = notifyEmail && notifyEmail.trim() ? notifyEmail.trim() : null;

  // 1) първо UPDATE (работи при политики само за update)
  const { data: updatedRows, error: updErr } = await supabase
    .from("device_settings")
    .update({
      guard_enabled: !!guardEnabled,
      notify_email: email,
    })
    .eq("device_id", deviceId)
    .select("device_id"); // важно: връща редове, за да знаем дали е обновило

  if (updErr) throw updErr;

  // ако е обновило ред -> приключваме
  if (updatedRows && updatedRows.length > 0) return;

  // 2) ако няма ред (0 обновени) -> INSERT
  const { error: insErr } = await supabase.from("device_settings").insert({
    device_id: deviceId,
    guard_enabled: !!guardEnabled,
    notify_email: email,
  });

  if (insErr) throw insErr;
}
