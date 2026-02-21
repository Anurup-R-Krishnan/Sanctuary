import React, { useCallback, useEffect, useState } from "react";
import { AppState, View, Text, StyleSheet, Pressable } from "react-native";
import { TopBar } from "../components/TopBar";
import { StaleDataNotice } from "../components/StaleDataNotice";
import { useAppStore } from "../state/useAppStore";
import { theme } from "../theme/tokens";
import { loadGoalsWithFallback } from "../services/goals";

export function StatsScreen() {
  const mode = useAppStore((s) => s.theme);
  const c = theme[mode];
  const books = useAppStore((s) => s.library);
  const goals = useAppStore((s) => s.goals);
  const goalsStale = useAppStore((s) => s.goalsStale);
  const goalsCachedAt = useAppStore((s) => s.goalsCachedAt);
  const setGoals = useAppStore((s) => s.setGoals);
  const active = books.filter((b) => b.status === "reading").length;
  const completed = books.filter((b) => b.status === "finished").length;
  const [loading, setLoading] = useState(false);

  const refreshGoals = useCallback(async () => {
    setLoading(true);
    const result = await loadGoalsWithFallback();
    setGoals(result.data, { stale: result.stale, cachedAt: result.cachedAt || null });
    setLoading(false);
  }, [setGoals]);

  useEffect(() => {
    void refreshGoals();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshGoals();
      }
    });
    return () => sub.remove();
  }, [refreshGoals]);

  return (
    <View style={[styles.page, { backgroundColor: c.background }]}> 
      <TopBar />
      <View style={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>Reading Stats</Text>
        <Text style={[styles.meta, { color: c.muted }]}>Reading now: {active}</Text>
        <Text style={[styles.meta, { color: c.muted }]}>Completed: {completed}</Text>
        <Text style={[styles.meta, { color: c.text, marginTop: 12 }]}>
          Today: {goals?.day.totalMinutes || 0} / {goals?.day.targetMinutes || 0} min
        </Text>
        <Text style={[styles.meta, { color: c.text }]}>
          This week: {goals?.week.totalMinutes || 0} / {goals?.week.targetMinutes || 0} min
        </Text>
        {!!goals && (
          <Text style={[styles.meta, { color: c.accent }]}>
            Goal progress: {goals.day.progressPercent}% today • {goals.week.progressPercent}% week
          </Text>
        )}
        {goalsStale && (
          <StaleDataNotice message="Offline stats shown" color={c.muted} cachedAt={goalsCachedAt} />
        )}
        <Pressable style={[styles.button, { backgroundColor: c.accent }]} onPress={() => void refreshGoals()} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Refreshing..." : "Refresh stats"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 10 },
  meta: { fontSize: 16, marginBottom: 8 },
  button: { marginTop: 14, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-start" },
  buttonText: { color: "white", fontWeight: "700" }
});
