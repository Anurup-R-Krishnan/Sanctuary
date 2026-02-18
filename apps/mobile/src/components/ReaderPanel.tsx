import React, { useEffect, useRef } from "react";
import { Animated, View, Text, Pressable, FlatList, StyleSheet } from "react-native";

interface ReaderPanelProps {
  visible: boolean;
  title: string;
  items: Array<{ label: string; href?: string; cfi?: string }>;
  onSelect: (item: { label: string; href?: string; cfi?: string }) => void;
  onClose: () => void;
  theme: { surface: string; text: string; muted: string; border: string };
}

export const ReaderPanel: React.FC<ReaderPanelProps> = ({ visible, title, items, onSelect, onClose, theme }) => {
  const translateX = useRef(new Animated.Value(visible ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : 1,
      duration: 260,
      useNativeDriver: true
    }).start();
  }, [visible, translateX]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay]}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.panel,
          { backgroundColor: theme.surface, borderColor: theme.border },
          {
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 320]
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={{ color: theme.muted }}>Close</Text>
          </Pressable>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.label}-${index}`}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [
                styles.row,
                { opacity: pressed ? 0.6 : 1, borderColor: theme.border }
              ]}>
              <Text style={[styles.rowLabel, { color: theme.text }]} numberOfLines={1}>{item.label}</Text>
              {item.cfi && <Text style={[styles.rowMeta, { color: theme.muted }]} numberOfLines={1}>{item.cfi.slice(0, 8)}</Text>}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>Nothing here yet</Text>}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,9,7,0.6)"
  },
  panel: {
    width: "78%",
    maxWidth: 360,
    height: "100%",
    paddingTop: 32,
    paddingHorizontal: 20,
    borderLeftWidth: 1.5,
    elevation: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: -2, height: 4 }
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  close: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12
  },
  list: {
    flex: 1
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "transparent"
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600"
  },
  rowMeta: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginTop: 2
  },
  separator: {
    height: 1,
    marginVertical: 2,
    opacity: 0.3
  },
  empty: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 13
  }
});
