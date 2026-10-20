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
      ["#689CD1", "#EAF4FF"],
      ["#B28A2C", "#FFF6DC"],
      ["#8A72CF", "#F0ECFE"],
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
    [/Ăn uống/, "#7463DF", "#F0ECFE", "food"],
    [/Nhà ở|Điện nước/, "#73B9A4", "#E6F8EE", "home"],
    [/Mua sắm/, "#E48E77", "#FFF0E9", "bag"],
    [/Đi lại/, "#689CD1", "#EAF4FF", "car"],
    [/Hiếu hỉ/, "#B89A45", "#FFF6DC", "gift"],
  ];
  const preset = presets.find(([pattern]) => pattern.test(name));
  if (preset) return { color: preset[1], tint: preset[2], icon: preset[3] };
  const variants = [
    ["#72BA8F", "#EAF8EE"],
    ["#A288DB", "#F0ECFE"],
    ["#689CD1", "#EAF4FF"],
    ["#DC91AB", "#FFF0F5"],
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
  size = 43,
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
        borderRadius: 15,
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
  const description = entry.note.trim();
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
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 14,
            lineHeight: 21,
            fontWeight: "600",
            color: colors.ink,
          }}
        >
          {description || entry.category}
        </Text>
        {!!description && (
          <Text
            numberOfLines={2}
            style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}
          >
            {entry.category}
          </Text>
        )}
        <Text
          numberOfLines={2}
          style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}
        >
          {[showDate ? displayDate(entry.date) : entry.payment, entry.member]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          flexShrink: 0,
          color: entry.kind === "income" ? colors.green : colors.orange,
        }}
      >
        {entry.kind === "income" ? "+" : "−"}
        {money(entry.amount)}
      </Text>
    </Pressable>
  );
}
