import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "./icon";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLedger } from "./store";
import { money, shiftMonth } from "./domain";
import { colors } from "./theme";
import { CalendarPicker } from "./calendar";
export { colors } from "./theme";
export const palette = [
  "#7463DF",
  "#F29A7F",
  "#61C9B2",
  "#EDCB6F",
  "#77A8DF",
  "#B79BE8",
  "#7DCA91",
  "#EA98B2",
  "#67BCCB",
  "#BEAA78",
];
export const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 19,
    paddingBottom: 100,
    gap: 18,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  title: {
    fontSize: 27,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 23,
    padding: 18,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heading: { fontSize: 16, fontWeight: "700", color: colors.ink },
  label: { fontSize: 14, color: colors.muted },
  value: { fontSize: 19, fontWeight: "700", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: "white",
    minHeight: 50,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.chip,
  },
  activeChip: { backgroundColor: colors.mint },
  chipText: { fontSize: 13, color: colors.ink },
  button: {
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    minHeight: 50,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  line: { height: 1, backgroundColor: colors.line },
  error: { color: "#AE3F32", fontSize: 14, lineHeight: 21 },
  empty: { paddingVertical: 20, alignItems: "center", gap: 12 },
  tiny: { fontSize: 12, color: colors.muted, lineHeight: 18 },
});
export function Page({
  title,
  subtitle,
  children,
  addAction = false,
  scrollRef,
  onContentSizeChange,
  headerAction,
}: {
  scrollRef?: React.RefObject<ScrollView | null>;
  onContentSizeChange?: () => void;
  addAction?: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  const { household, error, reload } = useLedger();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={st.page}>
      <ScrollView
        ref={scrollRef}
        onContentSizeChange={onContentSizeChange}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={st.content}
      >
        <View style={[st.row, { paddingVertical: 8 }]}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={st.tiny}>
              {household
                ? `Sổ gia đình: ${household.name}`
                : "Sổ riêng trên thiết bị"}
            </Text>
            <Text style={st.title}>{title}</Text>
            {subtitle && <Text style={st.tiny}>{subtitle}</Text>}
          </View>
          {headerAction ?? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cài đặt gia đình"
              onPress={() => router.push("/settings")}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.lavender,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="users" color={colors.violet} size={21} />
            </Pressable>
          )}
        </View>
        {!!error && (
          <Pressable accessibilityRole="button" onPress={() => void reload()}>
            <Text style={st.error}>{error} Chạm để thử lại.</Text>
          </Pressable>
        )}
        {children}
      </ScrollView>
      {addAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm giao dịch"
          onPress={() => router.push("/entry")}
          style={{
            position: "absolute",
            right: 20,
            bottom: 18,
            width: 52,
            height: 52,
            borderRadius: 18,
            backgroundColor: colors.green,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0px 5px 18px #09826724",
          }}
        >
          <Icon name="plus" color="white" size={27} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={st.card}>{children}</View>;
}
export function Button({
  title,
  onPress,
  disabled = false,
  tone = "green",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "green" | "violet";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={[
        st.button,
        tone === "violet" && { backgroundColor: colors.violet },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={st.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Chips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === item }}
          key={item}
          onPress={() => onChange(item)}
          style={[st.chip, value === item && st.activeChip]}
        >
          <Text
            style={[
              st.chipText,
              value === item && { color: colors.green, fontWeight: "600" },
            ]}
          >
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function MonthPicker() {
  const { month, setMonth } = useLedger();
  const [calendar, setCalendar] = useState(false);
  return (
    <>
      <View
        style={[
          st.row,
          {
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 0,
            alignSelf: "center",
            width: "100%",
            maxWidth: 360,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tháng trước"
          style={{ padding: 12 }}
          onPress={() => setMonth(shiftMonth(month, -1))}
        >
          <Icon name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn tháng và năm"
          onPress={() => setCalendar(true)}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>
            Tháng {Number(month.slice(5))} / {month.slice(0, 4)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tháng sau"
          style={{ padding: 12 }}
          onPress={() => setMonth(shiftMonth(month, 1))}
        >
          <Icon name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>
      {calendar && (
        <CalendarPicker
          mode="month"
          value={month}
          onSelect={setMonth}
          onClose={() => setCalendar(false)}
        />
      )}
    </>
  );
}
export function Empty({
  text = "Chưa có giao dịch trong tháng này.",
}: {
  text?: string;
}) {
  return (
    <View style={st.empty}>
      <Icon name="leaf-outline" size={36} color={colors.green} />
      <Text style={[st.subtitle, { textAlign: "center" }]}>{text}</Text>
    </View>
  );
}
export function Metric({
  label,
  value,
  color = colors.ink,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={st.label}>{label}</Text>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[st.value, { color }]}
      >
        {money(value)}
      </Text>
    </View>
  );
}
