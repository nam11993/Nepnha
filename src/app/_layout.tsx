import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LedgerProvider, useLedger } from "../store";
import { Button, colors, st } from "../ui";
function Routes() {
  const { ready, error, reload } = useLedger();
  if (!ready)
    return (
      <View
        style={[st.page, { justifyContent: "center", padding: 30, gap: 20 }]}
      >
        {error ? (
          <>
            <Text style={st.error}>{error}</Text>
            <Button title="Thử lại" onPress={() => void reload()} />
          </>
        ) : (
          <ActivityIndicator color={colors.green} />
        )}
      </View>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="entry" options={{ presentation: "modal" }} />
      <Stack.Screen name="assistant" />
    </Stack>
  );
}
export default function Root() {
  return (
    <SafeAreaProvider>
      <LedgerProvider>
        <StatusBar style="dark" />
        <Routes />
      </LedgerProvider>
    </SafeAreaProvider>
  );
}
