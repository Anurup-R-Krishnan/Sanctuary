import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "../state/useAppStore";
import { theme } from "../theme/tokens";

export function TopBar() {
  const mode = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const c = theme[mode];

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.border }]}> 
      <Text style={[styles.title, { color: c.text }]}>Sanctuary V2</Text>
      <Pressable onPress={() => setTheme(mode === "light" ? "dark" : "light") } style={[styles.button, { backgroundColor: c.background }]}>
        <Text style={{ color: c.text }}>{mode === "light" ? "Dark" : "Light"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 22,
    fontWeight: "700"
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  }
});
