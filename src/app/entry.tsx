import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useLedger } from "../store";
import {
  displayDate,
  Entry,
  Kind,
  localDate,
  parseAmount,
  parseDate,
  payments,
} from "../domain";
import { Button, Card, Chips, colors, Page, st } from "../ui";
import { CalendarPicker } from "../calendar";
import { CategoryManager } from "../category-manager";
import { CategoryIcon } from "../category-visuals";
import { Icon } from "../icon";
import { VoiceEntry } from "../voice-entry";
export default function Editor() {
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/transactions");
  }
  const { id, voice } = useLocalSearchParams<{ id?: string; voice?: string }>(),
    { data, save, busy, month, household } = useLedger(),
    existing = data.entries.find((e) => e.id === id);
  const [expected, setExpected] = useState(household?.revision);
  const [kind, setKind] = useState<Kind>(existing?.kind ?? "expense"),
    [amount, setAmount] = useState(existing ? String(existing.amount) : ""),
    [date, setDate] = useState(
      displayDate(
        existing?.date ??
          (localDate().startsWith(month) ? localDate() : month + "-01"),
      ),
    ),
    [category, setCategory] = useState(
      existing?.category ?? data.categories.expense[0],
    ),
    [note, setNote] = useState(existing?.note ?? ""),
    [member, setMember] = useState(existing?.member ?? ""),
    [payment, setPayment] = useState(existing?.payment ?? payments[0]),
    [amountFocused, setAmountFocused] = useState(false),
    [calendar, setCalendar] = useState(false),
    [error, setError] = useState(""),
    [voiceWarnings, setVoiceWarnings] = useState<string[] | null>(null),
    [deleting, setDeleting] = useState(false);
  async function submit() {
    try {
      setError("");
      const entry: Entry = {
        id: existing?.id ?? Crypto.randomUUID(),
        kind,
        amount: parseAmount(amount),
        date: parseDate(date),
        category,
        note: note.trim(),
        member: member.trim(),
        payment,
      };
      await save(
        {
          ...data,
          entries: existing
            ? data.entries.map((e) => (e.id === existing.id ? entry : e))
            : [...data.entries, entry],
        },
        expected,
      );
      close();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove() {
    try {
      await save(
        { ...data, entries: data.entries.filter((e) => e.id !== existing?.id) },
        expected,
      );
      close();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page title={existing ? "Sửa giao dịch" : "Ghi thu / chi"}>
        <Pressable
          accessibilityRole="button"
          onPress={close}
          style={{ alignSelf: "flex-start", paddingVertical: 6 }}
        >
          <Text style={{ color: colors.green, fontWeight: "600" }}>Đóng</Text>
        </Pressable>
        <Chips
          items={["Khoản chi", "Khoản thu"]}
          value={kind === "expense" ? "Khoản chi" : "Khoản thu"}
          onChange={(v) => {
            const k = v === "Khoản thu" ? "income" : "expense";
            setKind(k);
            setCategory(data.categories[k][0]);
          }}
        />
        <VoiceEntry
          allowMultiple={!existing}
          onBatchSaved={close}
          initiallyOpen={voice === "1" && !existing}
          onApply={(draft) => {
            setVoiceWarnings(draft.warnings);
            if (draft.kind) {
              setKind(draft.kind);
              setCategory(draft.category ?? data.categories[draft.kind][0]);
            } else if (draft.category) setCategory(draft.category);
            setAmount(draft.amount === undefined ? "" : String(draft.amount));
            if (draft.date) setDate(displayDate(draft.date));
            if (draft.payment) setPayment(draft.payment);
            if (draft.member) setMember(draft.member);
            if (draft.note) setNote(draft.note);
            setError("");
          }}
        />
        {voiceWarnings && (
          <Card>
            <Text
              style={{ color: colors.green, fontWeight: "600", lineHeight: 22 }}
            >
              AI đã điền thông tin. Hãy kiểm tra rồi bấm Lưu giao dịch.
            </Text>
            {voiceWarnings.map((warning, i) => (
              <Text key={i} style={st.tiny}>
                {warning}
              </Text>
            ))}
          </Card>
        )}
        <Card>
          <Text style={st.label}>SỐ TIỀN (VND)</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: amountFocused ? colors.green : colors.line,
              borderRadius: 14,
              backgroundColor: amountFocused ? colors.white : colors.bg,
            }}
          >
            <TextInput
              autoFocus={voice !== "1"}
              testID="amount-input"
              accessibilityLabel="Số tiền"
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
              maxLength={13}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 24,
                lineHeight: 32,
                color: colors.ink,
                fontWeight: "600",
                minHeight: 58,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 14,
                outlineWidth: 0,
              }}
            />
            <Text
              style={{ color: colors.muted, fontSize: 20, paddingRight: 16 }}
            >
              ₫
            </Text>
          </View>
          <Text style={st.tiny}>Nhập số nguyên, ví dụ: 150000</Text>
        </Card>
        <View style={st.row}>
          <Text style={st.heading}>Danh mục</Text>
          <CategoryManager
            label="Thêm / sửa"
            initialKind={kind}
            expectedRevision={expected}
            onSaved={(changedKind, previous, name) => {
              setExpected((v) => (v === undefined ? undefined : v + 1));
              if (
                changedKind === kind &&
                (previous === null || category === previous)
              )
                setCategory(name);
            }}
          />
        </View>
        <View style={{ gap: 10 }}>
          {Array.from(
            { length: Math.ceil(data.categories[kind].length / 3) },
            (_, row) => (
              <View key={row} style={{ flexDirection: "row", gap: 10 }}>
                {Array.from({ length: 3 }, (_, column) => {
                  const name = data.categories[kind][row * 3 + column];
                  return name ? (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityLabel={name}
                      accessibilityState={{ selected: category === name }}
                      onPress={() => setCategory(name)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 116,
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 9,
                        paddingVertical: 14,
                        paddingHorizontal: 7,
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor:
                          category === name ? colors.green : "transparent",
                        backgroundColor:
                          category === name ? colors.mint : colors.white,
                      }}
                    >
                      <CategoryIcon name={name} kind={kind} />
                      <Text
                        style={{
                          fontSize: 12,
                          lineHeight: 19,
                          textAlign: "center",
                          color: colors.ink,
                        }}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  ) : (
                    <View key={column} style={{ flex: 1, minWidth: 0 }} />
                  );
                })}
              </View>
            ),
          )}
        </View>
        <Text style={st.label}>Ngày (dd/mm/yyyy)</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ngày giao dịch"
          style={[st.input, st.row]}
          onPress={() => setCalendar(true)}
        >
          <Text style={{ color: colors.ink, fontSize: 16 }}>{date}</Text>
          <Icon name="calendar-outline" size={22} color={colors.green} />
        </Pressable>
        {calendar && (
          <CalendarPicker
            mode="day"
            value={parseDate(date)}
            onSelect={(v) => setDate(displayDate(v))}
            onClose={() => setCalendar(false)}
          />
        )}
        <Text style={st.label}>Nội dung</Text>
        <TextInput
          accessibilityLabel="Nội dung"
          style={st.input}
          value={note}
          onChangeText={setNote}
          placeholder="Ví dụ: Đi chợ cuối tuần"
          placeholderTextColor={colors.muted}
          maxLength={300}
        />
        <Text style={st.label}>Thành viên (không bắt buộc)</Text>
        <TextInput
          accessibilityLabel="Thành viên"
          style={st.input}
          value={member}
          onChangeText={setMember}
          placeholder="Tên người thu / chi"
          placeholderTextColor={colors.muted}
          maxLength={80}
        />
        <Text style={st.label}>Thanh toán</Text>
        <Chips items={payments} value={payment} onChange={setPayment} />
        {!!error && (
          <Text accessibilityRole="alert" style={st.error}>
            {error}
          </Text>
        )}
        <Button
          title={busy ? "Đang lưu…" : "Lưu giao dịch"}
          disabled={busy}
          onPress={() => void submit()}
        />
        {existing &&
          (deleting ? (
            <View style={{ gap: 12 }}>
              <Text style={st.error}>
                Xóa giao dịch này? Số liệu tổng hợp sẽ được tính lại.
              </Text>
              <Button
                title="Xác nhận xóa"
                disabled={busy}
                onPress={() => void remove()}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setDeleting(false)}
              >
                <Text style={st.subtitle}>Giữ lại giao dịch</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setDeleting(true)}
              style={{ padding: 12, alignItems: "center" }}
            >
              <Text style={st.error}>Xóa giao dịch</Text>
            </Pressable>
          ))}
      </Page>
    </KeyboardAvoidingView>
  );
}
