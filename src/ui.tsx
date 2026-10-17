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
  "#257968",
  "#E79B48",
  "#567EA1",
  "#B7778B",
  "#8A9960",
  "#9D78B8",
  "#58A6A0",
  "#B5A26C",
  "#738898",
  "#BF765C",
];
export const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 18,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 17,
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
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: "white",
    minHeight: 50,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: "#EBEEF1",
  },
  activeChip: { backgroundColor: colors.green },
  chipText: { fontSize: 13, color: colors.ink },
  button: {
    backgroundColor: colors.green,
    borderRadius: 15,
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
}: {
  scrollRef?: React.RefObject<ScrollView | null>;
  onContentSizeChange?: () => void;
  addAction?: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cài đặt gia đình"
            onPress={() => router.push("/settings")}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: colors.mint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="users" color={colors.green} size={21} />
          </Pressable>
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
            backgroundColor: "#239C79",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0px 5px 18px #21866533",
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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={[st.button, disabled && { opacity: 0.45 }]}
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
          <Text style={[st.chipText, value === item && { color: "white" }]}>
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
            backgroundColor: "#F0F3F5",
            borderRadius: 22,
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
