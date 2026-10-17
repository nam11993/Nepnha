import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Icon, type IconName } from "./icon";
import { type Entry, type Kind, displayDate, money } from "./domain";
import { colors } from "./theme";
export function categoryStyle(
  name: string,
  kind: Kind = "expense",
): { color: string; tint: string; icon: IconName } {
  if (kind === "income") {
    const incomeColors = [
      [colors.green, colors.mint],
      ["#568FA9", "#EAF5FA"],
      ["#B58931", "#FFF4DC"],
      ["#927ABF", "#F0EBFA"],
    ];
    const index =
      name === "Lương"
        ? 0
        : Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) %
          incomeColors.length;
    const [color, tint] = incomeColors[index];
    return { color, tint, icon: "cash" };
  }
  const presets: [RegExp, string, string, IconName][] = [
    [/Ăn uống/, "#B58931", "#FFF4DC", "food"],
    [/Nhà ở|Điện nước/, "#927ABF", "#F0EBFA", "home"],
    [/Mua sắm/, "#C87984", "#FDEEF0", "bag"],
    [/Đi lại/, "#568FA9", "#EAF5FA", "car"],
    [/Hiếu hỉ/, "#B58931", "#FFF4DC", "gift"],
  ];
  const preset = presets.find(([pattern]) => pattern.test(name));
  if (preset) return { color: preset[1], tint: preset[2], icon: preset[3] };
  const variants = [
    ["#759957", "#EFF6E7"],
    ["#927ABF", "#F0EBFA"],
    ["#568FA9", "#EAF5FA"],
    ["#C87984", "#FDEEF0"],
  ];
  const hash = Array.from(name).reduce(
    (a, c) => (a * 31 + c.charCodeAt(0)) >>> 0,
    0,
  );
  const [color, tint] = variants[hash % variants.length];
  return { color, tint, icon: "wallet-outline" };
}
export function CategoryIcon({
  name,
  kind = "expense",
  size = 38,
}: {
  name: string;
  kind?: Kind;
  size?: number;
}) {
  const appearance = categoryStyle(name, kind);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 13,
        backgroundColor: appearance.tint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={appearance.icon} size={21} color={appearance.color} />
    </View>
  );
}
export function TransactionRow({
  entry,
  showDate = false,
}: {
  entry: Entry;
  showDate?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: "/entry", params: { id: entry.id } })
      }
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        paddingVertical: 12,
      }}
    >
      <CategoryIcon name={entry.category} kind={entry.kind} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>
          {entry.category}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}
        >
          {[
            showDate ? displayDate(entry.date) : entry.note || entry.payment,
            entry.member,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: entry.kind === "income" ? colors.green : colors.orange,
        }}
      >
        {entry.kind === "income" ? "+" : "−"}
        {money(entry.amount)}
      </Text>
    </Pressable>
  );
}
