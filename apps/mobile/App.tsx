import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAppStore } from "./src/state/useAppStore";

export default function App() {
  const dark = useAppStore((s) => s.theme === "dark");

  return (
    <NavigationContainer theme={dark ? DarkTheme : DefaultTheme}>
      <StatusBar style={dark ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
  );
}
