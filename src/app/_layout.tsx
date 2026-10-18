import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View, ScrollView } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LedgerProvider, useLedger } from "../store";
import { Family } from "../family";
import { Button, colors, st } from "../ui";
function Routes() {
  const { ready, error, reload, session, profile, household } = useLedger();
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
  if (session && !profile?.display_name)
    return (
      <SafeAreaView style={st.page}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[st.content, { paddingTop: 36 }]}
        >
          <Family />
        </ScrollView>
      </SafeAreaView>
    );
  return (
    <Stack
      key={(session?.user.id ?? "guest") + ":" + (household?.id ?? "local")}
      screenOptions={{ headerShown: false }}
    >
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
