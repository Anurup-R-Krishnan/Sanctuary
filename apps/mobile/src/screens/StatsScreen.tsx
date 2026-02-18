import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TopBar } from "../components/TopBar";
import { useAppStore } from "../state/useAppStore";
import { theme } from "../theme/tokens";

export function StatsScreen() {
  const mode = useAppStore((s) => s.theme);
  const c = theme[mode];
  const books = useAppStore((s) => s.library);
  const active = books.filter((b) => b.status === "reading").length;
  const completed = books.filter((b) => b.status === "finished").length;

  return (
    <View style={[styles.page, { backgroundColor: c.background }]}> 
      <TopBar />
      <View style={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>Reading Stats</Text>
        <Text style={[styles.meta, { color: c.muted }]}>Reading now: {active}</Text>
        <Text style={[styles.meta, { color: c.muted }]}>Completed: {completed}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 10 },
  meta: { fontSize: 16, marginBottom: 8 }
});
