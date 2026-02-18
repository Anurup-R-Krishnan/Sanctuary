import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ReaderScreen } from "../screens/ReaderScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { StatsScreen } from "../screens/StatsScreen";

const Tabs = createBottomTabNavigator();

export function RootNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Library" component={LibraryScreen} />
      <Tabs.Screen name="Reader" component={ReaderScreen} />
      <Tabs.Screen name="Stats" component={StatsScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}
