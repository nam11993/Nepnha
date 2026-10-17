import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { breakdown, money, monthEntries, parseAmount } from "../../domain";
import { CategoryIcon } from "../../category-visuals";
import { useLedger } from "../../store";
import { Button, Card, colors, MonthPicker, Page, st } from "../../ui";
function BudgetForm() {
  const { data, month, busy, save, household } = useLedger(),
    [expected, setExpected] = useState(household?.revision),
    [draft, setDraft] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        Object.entries(data.budgets[month] ?? {}).map(([k, v]) => [
          k,
          String(v),
        ]),
      ),
    ),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const spent = breakdown(
    monthEntries(data, month),
    "expense",
    data.categories.expense,
  );
  async function submit() {
    try {
      setError("");
      const amounts = Object.fromEntries(
        Object.entries(draft)
          .filter(([, v]) => v.trim() !== "")
          .map(([k, v]) => [k, parseAmount(v, true)]),
      );
      await save(
        { ...data, budgets: { ...data.budgets, [month]: amounts } },
        expected,
      );
      setExpected(expected === undefined ? undefined : expected + 1);
      setMessage("Đã lưu ngân sách tháng này.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page title="Ngân sách" subtitle="Đặt giới hạn riêng cho từng tháng.">
      <MonthPicker />
      <Text style={st.subtitle}>
        Để trống nếu chưa đặt hạn mức. Nhập 0 nếu không dự định chi cho danh mục
        đó.
      </Text>
      {data.categories.expense.map((category, i) => {
        const limit = data.budgets[month]?.[category],
          amount = spent[i].amount;
        return (
          <Card key={category}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <CategoryIcon name={category} />
              <Text style={[st.heading, { flex: 1 }]}>{category}</Text>
            </View>
            <View style={st.row}>
              <Text style={st.subtitle}>Đã chi</Text>
              <Text style={{ fontWeight: "600", color: colors.ink }}>
                {money(amount)}
              </Text>
            </View>
            <TextInput
              accessibilityLabel={"Hạn mức " + category}
              placeholder="Chưa đặt hạn mức (VND)"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={draft[category] ?? ""}
              onChangeText={(v) => {
                setDraft({ ...draft, [category]: v });
                setMessage("");
              }}
              style={st.input}
            />
            {limit !== undefined && (
              <>
                <View
                  style={{
                    height: 6,
                    backgroundColor: colors.line,
                    borderRadius: 3,
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      width: `${Math.min(100, limit === 0 ? (amount > 0 ? 100 : 0) : (amount / limit) * 100)}%`,
                      backgroundColor:
                        amount > limit ? colors.orange : colors.green,
                      borderRadius: 3,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: amount > limit ? colors.orange : colors.muted,
                  }}
                >
                  {amount > limit
                    ? "Vượt " + money(amount - limit)
                    : "Còn " + money(limit - amount)}{" "}
                  theo hạn mức đã lưu
                </Text>
              </>
            )}
          </Card>
        );
      })}
      {!!error && (
        <Text accessibilityRole="alert" style={st.error}>
          {error}
        </Text>
      )}
      {!!message && <Text style={{ color: colors.green }}>{message}</Text>}
      <Button
        title={busy ? "Đang lưu…" : "Lưu ngân sách tháng này"}
        disabled={busy}
        onPress={() => void submit()}
      />
    </Page>
  );
}

export default function Budget() {
  const { month, household, data } = useLedger();
  return (
    <BudgetForm
      key={
        month +
        (household?.id ?? "local") +
        JSON.stringify(data.categories.expense)
      }
    />
  );
}
