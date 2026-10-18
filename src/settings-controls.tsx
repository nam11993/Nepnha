import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "./icon";
import { colors } from "./theme";
export function SettingRow({
  title,
  detail,
  icon,
  onPress,
  disabled = false,
  danger = false,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 13,
        opacity: disabled ? 0.55 : 1,
        backgroundColor: pressed ? colors.bg : colors.white,
      })}
    >
      {icon && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: danger ? colors.rose : colors.lavender,
          }}
        >
          <Icon
            name={icon}
            size={19}
            color={danger ? colors.orange : colors.violet}
          />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            lineHeight: 21,
            color: danger ? colors.orange : colors.ink,
          }}
        >
          {title}
        </Text>
        {!!detail && (
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}>
            {detail}
          </Text>
        )}
      </View>
      {!disabled && (
        <Icon name="chevron-forward" size={16} color={colors.muted} />
      )}
    </Pressable>
  );
}
export function SettingAction({
  title,
  onPress,
  disabled = false,
  tone = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        minHeight: 44,
        justifyContent: "center",
        paddingVertical: 11,
        paddingHorizontal: 16,
        borderRadius: 13,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        backgroundColor:
          tone === "primary"
            ? colors.green
            : tone === "danger"
              ? colors.rose
              : colors.chip,
      })}
    >
      <Text
        style={{
          fontSize: 14,
          lineHeight: 21,
          fontWeight: "600",
          color:
            tone === "primary"
              ? colors.white
              : tone === "danger"
                ? colors.orange
                : colors.ink,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {React.Children.toArray(children).map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <View
              style={{
                height: 1,
                backgroundColor: colors.line,
                marginHorizontal: 16,
              }}
            />
          )}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}
