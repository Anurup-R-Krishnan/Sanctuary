import React, { useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { TopBar } from "../components/TopBar";
import { useAppStore } from "../state/useAppStore";
import { api } from "../services/api";
import { theme } from "../theme/tokens";

export function LibraryScreen() {
  const mode = useAppStore((s) => s.theme);
  const c = theme[mode];
  const items = useAppStore((s) => s.library);
  const setItems = useAppStore((s) => s.setLibrary);
  const selectBook = useAppStore((s) => s.selectBook);

  useEffect(() => {
    api.getLibrary().then(setItems).catch(() => setItems([]));
  }, [setItems]);

  return (
    <View style={[styles.page, { backgroundColor: c.background }]}> 
      <TopBar />
      <Text style={[styles.heading, { color: c.text }]}>Continue Reading</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => selectBook(item.id)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}> 
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>{item.author}</Text>
            <Text style={[styles.progress, { color: c.accent }]}>{item.progressPercent}%</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ color: c.muted, paddingHorizontal: 16 }}>No books yet. Upload in existing web app or API v2.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  heading: { fontSize: 24, fontWeight: "700", paddingHorizontal: 16, paddingTop: 16 },
  list: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  title: { fontSize: 17, fontWeight: "600" },
  meta: { marginTop: 2, fontSize: 14 },
  progress: { marginTop: 8, fontSize: 13, fontWeight: "600" }
});
