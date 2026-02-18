import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { TopBar } from "../components/TopBar";
import { useAppStore } from "../state/useAppStore";
import { theme } from "../theme/tokens";
import { api } from "../services/api";

export function SettingsScreen() {
  const mode = useAppStore((s) => s.theme);
  const c = theme[mode];
  const [message, setMessage] = useState("Loading settings...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then((s) => setMessage(`Preset: ${s.themePreset}, Font: ${s.fontScale}`))
      .catch(() => setMessage("Unable to load v2 settings"));
  }, []);

  const applyMinimalPreset = async () => {
    try {
      setSaving(true);
      await api.saveSettings({
        themePreset: "paper",
        fontScale: 102,
        lineHeight: 1.7,
        textWidth: 72,
        motion: "reduced",
        tapZones: true,
        swipeNav: true,
        autoHideMs: 4200,
        showProgress: true,
        showPageMeta: true,
        accent: "#B37A4C"
      });
      setMessage("Preset saved to /api/v2/settings");
    } catch {
      setMessage("Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: c.background }]}> 
      <TopBar />
      <View style={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>Reader Settings V2</Text>
        <Text style={{ color: c.muted, marginTop: 8 }}>{message}</Text>
        <Pressable style={[styles.button, { backgroundColor: c.accent }]} onPress={applyMinimalPreset} disabled={saving}>
          <Text style={{ color: "white", fontWeight: "700" }}>{saving ? "Saving..." : "Apply Minimal Preset"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  button: { marginTop: 20, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignSelf: "flex-start" }
});
