import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import * as Crypto from "expo-crypto";
import type { BatchVoiceDraft } from "./ai-contract";
import { displayDate, parseDate, money, payments } from "./domain";
import { useLedger } from "./store";
import { Button, Card, Chips, colors, st } from "./ui";
import { CalendarPicker } from "./calendar";
import {
  reviewRows,
  appendVoiceBatch,
  type ReviewRow,
} from "./voice-batch-domain";
export function VoiceBatchReview({
  drafts,
  clarification,
  onSaved,
  onBack,
}: {
  drafts: BatchVoiceDraft[];
  clarification: string;
  onSaved: () => void;
  onBack: () => void;
}) {
  const { data, save, busy, session, household, profile } = useLedger();
  const [origin] = useState(() => ({
    userId: session?.user.id,
    id: household?.id,
    revision: household?.revision,
  }));
  const [rows, setRows] = useState(() =>
    reviewRows(drafts).map((row) => ({
      ...row,
      member: row.member || profile?.display_name || "",
    })),
  );
  const [editing, setEditing] = useState<string | null>(null),
    [calendar, setCalendar] = useState<string | null>(null),
    [error, setError] = useState("");
  function change(key: string, patch: Partial<ReviewRow>) {
    if (busy) return;
    setRows((old) => old.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setError("");
  }
  async function submit() {
    if (busy) return;
    setError("");
    try {
      if (
        !session ||
        session.user.id !== origin.userId ||
        household?.id !== origin.id ||
        household?.revision !== origin.revision
      )
        throw Error(
          "Tài khoản hoặc sổ vừa thay đổi. Hãy quay lại tách giao dịch để tránh ghi đè.",
        );
      const next = appendVoiceBatch(data, rows, () => Crypto.randomUUID());
      await save(next, origin.revision);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const total = rows.reduce(
    (n, r) => n + (/^\d+$/.test(r.amount) ? Number(r.amount) : 0),
    0,
  );
  return (
    <View style={{ gap: 16 }}>
      <Text style={st.heading}>Đã tách {rows.length} giao dịch</Text>
      <Text style={st.subtitle}>
        Kiểm tra từng khoản, có thể chỉnh sửa hoặc bỏ khoản không đúng. Chưa có
        giao dịch nào được lưu.
      </Text>
      {!!clarification && <Text style={st.error}>{clarification}</Text>}
      {rows.map((r, i) => (
        <Card key={r.key}>
          <View style={st.row}>
            <Text style={st.heading}>
              Khoản {i + 1} ·{" "}
              {r.kind === "income"
                ? "Thu"
                : r.kind === "expense"
                  ? "Chi"
                  : "Chưa rõ loại"}
            </Text>
            <Text style={{ fontWeight: "700", color: colors.green }}>
              {/^[0-9]+$/.test(r.amount)
                ? money(Number(r.amount))
                : "Chưa rõ tiền"}
            </Text>
          </View>
          <Text style={st.tiny}>“{r.source}”</Text>
          <Text style={st.subtitle}>{r.note || "Chưa có nội dung"}</Text>
          <Text style={st.subtitle}>{r.category || "Cần chọn danh mục"}</Text>
          <Text style={st.tiny}>
            {r.date} · {r.payment}
            {r.member ? ` · ${r.member}` : ""}
          </Text>
          {r.warnings.map((w, j) => (
            <Text key={j} style={st.tiny}>
              {w}
            </Text>
          ))}
          <View style={st.row}>
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Chỉnh sửa khoản ${i + 1}`}
              onPress={() => setEditing(editing === r.key ? null : r.key)}
              style={{ paddingVertical: 9 }}
            >
              <Text style={{ color: colors.green, fontWeight: "600" }}>
                {editing === r.key ? "Thu gọn" : "Chỉnh sửa"}
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Bỏ khoản ${i + 1}`}
              onPress={() =>
                setRows((old) => old.filter((v) => v.key !== r.key))
              }
              style={{ paddingVertical: 9 }}
            >
              <Text style={st.error}>Bỏ khoản</Text>
            </Pressable>
          </View>
          {editing === r.key && (
            <View style={{ gap: 12 }}>
              <Chips
                items={["Khoản chi", "Khoản thu"]}
                value={
                  r.kind === "income"
                    ? "Khoản thu"
                    : r.kind === "expense"
                      ? "Khoản chi"
                      : ""
                }
                onChange={(v) =>
                  change(r.key, {
                    kind: v === "Khoản thu" ? "income" : "expense",
                    category: "",
                  })
                }
              />
              <Text style={st.label}>Số tiền (VND)</Text>
              <TextInput
                accessibilityLabel={`Số tiền khoản ${i + 1}`}
                style={st.input}
                value={r.amount}
                onChangeText={(amount) => change(r.key, { amount })}
                keyboardType="number-pad"
                maxLength={13}
                editable={!busy}
              />
              <Text style={st.label}>Danh mục</Text>
              <Chips
                items={r.kind ? data.categories[r.kind] : []}
                value={r.category}
                onChange={(category) => change(r.key, { category })}
              />
              <Text style={st.label}>Ngày</Text>
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Ngày khoản ${i + 1}`}
                style={st.input}
                onPress={() => setCalendar(r.key)}
              >
                <Text>{r.date}</Text>
              </Pressable>
              <Text style={st.label}>Nội dung</Text>
              <TextInput
                accessibilityLabel={`Nội dung khoản ${i + 1}`}
                style={st.input}
                value={r.note}
                onChangeText={(note) => change(r.key, { note })}
                maxLength={300}
                editable={!busy}
              />
              <Text style={st.label}>Thành viên thực hiện</Text>
              <TextInput
                accessibilityLabel={`Thành viên khoản ${i + 1}`}
                style={st.input}
                value={r.member}
                onChangeText={(member) => change(r.key, { member })}
                maxLength={80}
                editable={!busy}
              />
              <Text style={st.label}>Thanh toán</Text>
              <Chips
                items={payments}
                value={r.payment}
                onChange={(payment) => change(r.key, { payment })}
              />
            </View>
          )}
        </Card>
      ))}
      {!!calendar && (
        <CalendarPicker
          mode="day"
          value={parseDate(rows.find((r) => r.key === calendar)!.date)}
          onSelect={(v) => change(calendar, { date: displayDate(v) })}
          onClose={() => setCalendar(null)}
        />
      )}
      <Text style={st.heading}>Tổng các khoản: {money(total)}</Text>
      {!!error && (
        <Text accessibilityRole="alert" style={st.error}>
          {error}
        </Text>
      )}
      <Button
        title={busy ? "Đang lưu…" : `Lưu ${rows.length} giao dịch`}
        disabled={busy || !rows.length}
        onPress={() => void submit()}
      />
      <Pressable
        disabled={busy}
        accessibilityRole="button"
        onPress={onBack}
        style={{ padding: 12, alignItems: "center" }}
      >
        <Text style={{ color: colors.green }}>Quay lại câu nói</Text>
      </Pressable>
    </View>
  );
}
