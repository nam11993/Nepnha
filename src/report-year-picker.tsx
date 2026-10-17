import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Button, Chips, colors, st } from "./ui";
import { Dialog } from "./dialog";
import { Icon } from "./icon";
export function ReportYearPicker({
  value,
  years,
  onChange,
}: {
  value: string;
  years: string[];
  onChange: (year: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [input, setInput] = useState(value),
    [error, setError] = useState("");
  const choose = (year: string) => {
    if (!/^(20\d{2}|2100)$/.test(year)) {
      setError("Chọn năm từ 2000 đến 2100.");
      return;
    }
    onChange(year);
    setOpen(false);
  };
  const options = [
    ...new Set([value, String(new Date().getFullYear()), ...years]),
  ].sort((a, b) => Number(b) - Number(a));
  return (
    <>
      <View
        style={[
          st.row,
          { backgroundColor: colors.bg, borderRadius: 14, padding: 4 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Năm báo cáo trước"
          disabled={value === "2000"}
          onPress={() => onChange(String(Number(value) - 1))}
          style={{ padding: 12, opacity: value === "2000" ? 0.3 : 1 }}
        >
          <Icon name="chevron-back" size={20} color={colors.green} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn năm báo cáo"
          onPress={() => {
            setInput(value);
            setError("");
            setOpen(true);
          }}
          style={{ padding: 12 }}
        >
          <Text style={{ fontWeight: "700", color: colors.ink, fontSize: 16 }}>
            Năm {value} ▾
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Năm báo cáo sau"
          disabled={value === "2100"}
          onPress={() => onChange(String(Number(value) + 1))}
          style={{ padding: 12, opacity: value === "2100" ? 0.3 : 1 }}
        >
          <Icon name="chevron-forward" size={20} color={colors.green} />
        </Pressable>
      </View>
      {open && (
        <Dialog visible title="Chọn năm báo cáo" onClose={() => setOpen(false)}>
          <Text style={st.subtitle}>
            Chọn năm có dữ liệu hoặc nhập năm muốn xem.
          </Text>
          <Chips items={options} value={value} onChange={choose} />
          <Text style={st.label}>Năm (2000–2100)</Text>
          <TextInput
            accessibilityLabel="Năm báo cáo"
            style={st.input}
            value={input}
            onChangeText={setInput}
            keyboardType="number-pad"
            maxLength={4}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={st.error}>
              {error}
            </Text>
          )}
          <Button title="Xem năm" onPress={() => choose(input.trim())} />
        </Dialog>
      )}
    </>
  );
}
