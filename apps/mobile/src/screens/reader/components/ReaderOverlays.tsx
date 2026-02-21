import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { StaleDataNotice } from "../../../components/StaleDataNotice";

interface ReaderOverlaysProps {
  readerError: string | null;
  goalsStale: boolean;
  chapterPreview: string | null;
}

export function ReaderOverlays({ readerError, goalsStale, chapterPreview }: ReaderOverlaysProps) {
  return (
    <>
      {!!readerError && (
        <View style={styles.errorCapsule}>
          <Text style={styles.errorText}>{readerError}</Text>
        </View>
      )}
      {goalsStale && (
        <View style={styles.offlineGoalsNotice}>
          <StaleDataNotice message="Goal stats are currently offline" color="#cdbcb0" />
        </View>
      )}
      {chapterPreview && (
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Next chapter</Text>
          <Text style={styles.previewText}>{chapterPreview}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  errorCapsule: {
    position: "absolute",
    top: 80,
    right: 24,
    backgroundColor: "rgba(180,40,40,0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    elevation: 8
  },
  errorText: { color: "#fff" },
  previewCard: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: "rgba(16,9,6,0.88)",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },
  previewLabel: { fontSize: 10, color: "#c6b3a1", marginBottom: 4 },
  previewText: { fontSize: 15, color: "#fff", fontWeight: "600" },
  offlineGoalsNotice: {
    position: "absolute",
    top: 110,
    left: 20
  }
});
