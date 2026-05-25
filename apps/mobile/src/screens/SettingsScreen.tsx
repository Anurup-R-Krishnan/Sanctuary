import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";

import { TopBar } from "../components/TopBar";
import { useAppStore } from "../state/useAppStore";
import { sharedStyles } from "../theme/sharedStyles";
import { theme } from "../theme/tokens";

export function SettingsScreen() {
  const mode = useAppStore((s) => s.theme);
  const c = theme[mode];
  const [message, setMessage] = useState("Loading settings...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then((s) => setMessage(`Preset: ${s.themePreset}, Font: ${s.fontScale}`))
      .catch(() => setMessage("Unable to load settings"));
  }, []);

  const applyMinimalPreset = async () => {
    try {
      setSaving(true);
      await api.saveSettings({
        dailyGoal: 30,
        weeklyGoal: 150,
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
      setMessage("Preset saved to /api/settings");
    } catch {
      setMessage("Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[sharedStyles.page, { backgroundColor: c.background }]}> 
      <TopBar />
      <View style={sharedStyles.content}>
        <Text style={[sharedStyles.title, { color: c.text }]}>Reader Settings</Text>
        <Text style={{ color: c.muted, marginTop: 8 }}>{message}</Text>
        <Pressable style={[sharedStyles.button, { backgroundColor: c.accent }]} onPress={applyMinimalPreset} disabled={saving}>
          <Text style={sharedStyles.buttonText}>{saving ? "Saving..." : "Apply Minimal Preset"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
