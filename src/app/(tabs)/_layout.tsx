import React from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../icon";
import { colors } from "../../ui";
export default function Layout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: colors.line,
          height: 70 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
        },
        tabBarItemStyle: { paddingHorizontal: 0, minWidth: 0 },
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 18,
          paddingBottom: 2,
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      {(
        [
          ["index", "Tổng quan", "grid-outline"],
          ["transactions", "Giao dịch", "swap-horizontal-outline"],
          ["reports", "Báo cáo", "pie-chart-outline"],
          ["budget", "Ngân sách", "wallet-outline"],
          ["settings", "Cài đặt", "settings-outline"],
        ] as const
      ).map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarLabel: ({ color }) => (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={{
                  color,
                  fontSize: 11,
                  lineHeight: 20,
                  paddingTop: 2,
                  paddingBottom: 4,
                  width: "100%",
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                {title}
              </Text>
            ),
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={{
                  width: 44,
                  height: 31,
                  borderRadius: 12,
                  backgroundColor: focused ? colors.mint : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={icon} color={color} size={Math.min(size, 23)} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
