import React from "react";
import { Text, StyleSheet } from "react-native";

interface StaleDataNoticeProps {
  message: string;
  color: string;
  cachedAt?: string | null;
}

export function StaleDataNotice({ message, color, cachedAt }: StaleDataNoticeProps) {
  return (
    <Text style={[styles.text, { color }]}>
      {message}
      {cachedAt ? ` (cached ${new Date(cachedAt).toLocaleString()})` : ""}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    marginTop: 6
  }
});
