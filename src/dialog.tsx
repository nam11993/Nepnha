import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "./theme";

export function Dialog({
  visible,
  title,
  onClose,
  children,
  scrollRef,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "rgba(25,43,63,0.35)",
          padding: 18,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 420,
            maxHeight: "92%",
            borderRadius: 27,
            backgroundColor: colors.white,
          }}
        >
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 16 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: 21,
                  fontWeight: "700",
                  color: colors.ink,
                  flex: 1,
                }}
              >
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Đóng ${title.toLowerCase()}`}
                onPress={onClose}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text style={{ color: colors.green, fontWeight: "600" }}>
                  Đóng
                </Text>
              </Pressable>
            </View>
            {children}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
