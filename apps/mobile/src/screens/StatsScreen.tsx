import React, { useCallback, useEffect, useState } from "react";
import { AppState, View, Text, StyleSheet, Pressable } from "react-native";

import { StaleDataNotice } from "../components/StaleDataNotice";
import { TopBar } from "../components/TopBar";
import { useAppStore } from "../state/useAppStore";
import { sharedStyles } from "../theme/sharedStyles";
import { theme } from "../theme/tokens";

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
    <View style={[sharedStyles.page, { backgroundColor: c.background }]}> 
      <TopBar />
      <View style={sharedStyles.content}>
        <Text style={[sharedStyles.title, { color: c.text, marginBottom: 10 }]}>Reading Stats</Text>
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
        <Pressable style={[sharedStyles.button, { backgroundColor: c.accent, marginTop: 14 }]} onPress={() => void refreshGoals()} disabled={loading}>
          <Text style={sharedStyles.buttonText}>{loading ? "Refreshing..." : "Refresh stats"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: 16, marginBottom: 8 }
});
