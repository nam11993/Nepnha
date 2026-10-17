import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors, st } from "./ui";
import type { AIStatus } from "./ai-client";
export function AIConnection({
  status,
  refresh,
}: {
  status: AIStatus;
  refresh: () => void;
}) {
  return (
    <View
      style={{
        gap: 7,
        padding: 12,
        borderRadius: 13,
        backgroundColor: colors.bg,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          lineHeight: 19,
          color: status.configured ? colors.green : colors.muted,
        }}
      >
        {status.message}
      </Text>
      {status.configured && (
        <Text style={st.tiny}>
          Đã dùng {status.used ?? 0}/{status.limit ?? 20} lượt hôm nay.
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kiểm tra kết nối AI"
        onPress={refresh}
        style={{ alignSelf: "flex-start", paddingVertical: 7 }}
      >
        <Text style={{ fontSize: 12, color: colors.green, fontWeight: "600" }}>
          Kiểm tra kết nối AI
        </Text>
      </Pressable>
    </View>
  );
}
