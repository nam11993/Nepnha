import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  calendarDays,
  currentMonth,
  displayDate,
  localDate,
  shiftMonth,
} from "./domain";
import { Dialog } from "./dialog";
import { Icon } from "./icon";
import { colors } from "./theme";

export function CalendarPicker({
  value,
  mode,
  onSelect,
  onClose,
}: {
  value: string;
  mode: "month" | "day";
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(value.slice(0, 7));
  const [monthsView, setMonthsView] = useState(mode === "month");
  const year = Number(month.slice(0, 4));
  const choose = (next: string) => {
    onSelect(next);
    onClose();
  };
  const move = (step: number) =>
    setMonth(shiftMonth(month, monthsView ? step * 12 : step));
  return (
    <Dialog
      visible
      title={mode === "month" ? "Chọn tháng" : "Chọn ngày"}
      onClose={onClose}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            monthsView ? "Năm trước" : "Tháng trước trong lịch"
          }
          onPress={() => move(-1)}
          style={{ padding: 12 }}
        >
          <Icon name="chevron-back" size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn tháng và năm trong lịch"
          onPress={() => setMonthsView(true)}
          style={{ padding: 10 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>
            {monthsView
              ? `Năm ${year}`
              : `Tháng ${Number(month.slice(5))} / ${year}`}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={monthsView ? "Năm sau" : "Tháng sau trong lịch"}
          onPress={() => move(1)}
          style={{ padding: 12 }}
        >
          <Icon name="chevron-forward" size={20} />
        </Pressable>
      </View>
      {monthsView ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {Array.from({ length: 12 }, (_, i) => {
            const next = `${year}-${String(i + 1).padStart(2, "0")}`;
            const selected = value.slice(0, 7) === next;
            return (
              <View key={next} style={{ width: "33.333%", padding: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Chọn tháng ${i + 1} năm ${year}`}
                  onPress={() => {
                    if (mode === "month") choose(next);
                    else {
                      setMonth(next);
                      setMonthsView(false);
                    }
                  }}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 12,
                    backgroundColor: selected ? colors.ink : "#EDF2EC",
                  }}
                >
                  <Text
                    style={{
                      color: selected ? "white" : colors.ink,
                      fontSize: 15,
                    }}
                  >
                    Tháng {i + 1}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
            <View
              key={day}
              style={{
                width: "14.2857%",
                alignItems: "center",
                paddingBottom: 10,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>{day}</Text>
            </View>
          ))}
          {calendarDays(month).map((day, i) => (
            <View key={i} style={{ width: "14.2857%", padding: 2 }}>
              {day ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn ngày ${displayDate(day)}`}
                  accessibilityState={{ selected: day === value }}
                  onPress={() => choose(day)}
                  style={{
                    minHeight: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor:
                      day === value
                        ? colors.ink
                        : day === localDate()
                          ? "#E8F2EB"
                          : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: day === value ? "white" : colors.ink,
                      fontSize: 15,
                    }}
                  >
                    {Number(day.slice(8))}
                  </Text>
                </Pressable>
              ) : (
                <View style={{ height: 40 }} />
              )}
            </View>
          ))}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => choose(mode === "month" ? currentMonth() : localDate())}
        style={{
          padding: 12,
          alignItems: "center",
          borderRadius: 12,
          backgroundColor: "#E8F2EB",
        }}
      >
        <Text style={{ fontWeight: "600", color: colors.green }}>
          {mode === "month" ? "Tháng hiện tại" : "Hôm nay"}
        </Text>
      </Pressable>
    </Dialog>
  );
}
