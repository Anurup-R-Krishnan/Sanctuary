import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { LibraryItemV2, ReadingGoalsV2 } from "@sanctuary/core";

interface ReaderHeaderProps {
  selected?: LibraryItemV2;
  chapterTitle: string;
  tocCount: number;
  bookmarkCount: number;
  goals: ReadingGoalsV2 | null;
  goalsStale: boolean;
  onToggleToc: () => void;
  onToggleBookmarks: () => void;
}

export function ReaderHeader({
  selected,
  chapterTitle,
  tocCount,
  bookmarkCount,
  goals,
  goalsStale,
  onToggleToc,
  onToggleBookmarks
}: ReaderHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{selected?.title || "Reader"}</Text>
        <Text style={styles.meta}>{selected?.author || "Open a book to start."}</Text>
        {!!selected && (
          <Text style={[styles.meta, styles.progressMeta]}>
            {chapterTitle ? `${chapterTitle} • ` : ""}
            {selected.progressPercent}% • TOC {tocCount} • Bookmarks {bookmarkCount}
          </Text>
        )}
        {!!goals && (
          <Text style={[styles.meta, styles.goalMeta]}>
            Goals: {goals.day.totalMinutes}/{goals.day.targetMinutes}m today • {goals.week.totalMinutes}/{goals.week.targetMinutes}m week
            {goalsStale ? " (offline)" : ""}
          </Text>
        )}
      </View>
      <View style={styles.headerActions}>
        <Pressable style={styles.actionBtn} onPress={onToggleToc}>
          <Text style={styles.actionText}>Contents</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onToggleBookmarks}>
          <Text style={styles.actionText}>Bookmarks</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: "row", alignItems: "flex-end" },
  title: { fontSize: 26, fontWeight: "700", color: "#fff" },
  meta: { fontSize: 14, letterSpacing: 0.4, color: "#b9ada2" },
  progressMeta: { color: "#a88e7b", marginTop: 4 },
  goalMeta: { color: "#f0cc98", marginTop: 4 },
  headerActions: { flexDirection: "row", marginLeft: 16 },
  actionBtn: { borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 12 }
});
