import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { SyncState } from "../../../services/progressSync";
import type { SessionSyncState } from "../../../services/sessionSync";

interface ReaderStatusRowsProps {
  readingTime: number;
  currentPage: number;
  totalPages: number;
  syncState: SyncState;
  sessionSyncState: SessionSyncState;
}

function progressSyncLabel(state: SyncState) {
  if (state === "syncing") return "Progress syncing…";
  if (state === "error") return "Progress sync error";
  return "Progress synced";
}

function sessionSyncLabel(state: SessionSyncState) {
  if (state === "syncing") return "Sessions syncing…";
  if (state === "error") return "Session sync error";
  return "Sessions synced";
}

export function ReaderStatusRows({
  readingTime,
  currentPage,
  totalPages,
  syncState,
  sessionSyncState
}: ReaderStatusRowsProps) {
  return (
    <>
      <View style={styles.statsWrap}>
        <Text style={[styles.statsLabel, styles.primaryStats]}>Reading time ~ {readingTime}m</Text>
        <Text style={[styles.statsLabel, styles.primaryStats]}>Page {currentPage || 1} / {totalPages || 1}</Text>
      </View>
      <View style={styles.syncStatusWrap}>
        <Text style={[styles.statsLabel, styles.syncText]}>{progressSyncLabel(syncState)}</Text>
        <Text style={[styles.statsLabel, styles.syncText]}>{sessionSyncLabel(sessionSyncState)}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  statsWrap: { marginHorizontal: 20, flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  syncStatusWrap: { marginHorizontal: 20, flexDirection: "row", justifyContent: "space-between", paddingBottom: 10 },
  statsLabel: { fontSize: 11, letterSpacing: 0.5 },
  primaryStats: { color: "#f6e8d9" },
  syncText: { color: "#cdd1cf" }
});
