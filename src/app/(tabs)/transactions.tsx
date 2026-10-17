import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useLedger } from "../../store";
import { displayDate, money, monthEntries, totals } from "../../domain";
import { Card, Chips, colors, Empty, MonthPicker, Page, st } from "../../ui";
import { TransactionRow } from "../../category-visuals";
import { Icon } from "../../icon";
export default function Transactions() {
  const { data, month } = useLedger(),
    [filter, setFilter] = useState("Tất cả"),
    [search, setSearch] = useState("");
  const entries = monthEntries(data, month).filter(
    (e) =>
      (filter === "Tất cả" ||
        e.kind === (filter === "Khoản thu" ? "income" : "expense")) &&
      `${e.note} ${e.category} ${e.member}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  const dates = [...new Set(entries.map((e) => e.date))];
  return (
    <Page
      title="Giao dịch"
      subtitle="Mỗi khoản tiền đều có một câu chuyện."
      addAction
    >
      <MonthPicker />
      <Chips
        items={["Tất cả", "Khoản thu", "Khoản chi"]}
        value={filter}
        onChange={setFilter}
      />
      <View
        style={[
          st.input,
          { flexDirection: "row", alignItems: "center", gap: 10 },
        ]}
      >
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel="Tìm giao dịch"
          placeholder="Nội dung, danh mục, thành viên…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 14,
            color: colors.ink,
            outlineWidth: 0,
          }}
        />
      </View>
      <Text style={st.tiny}>
        {entries.length} giao dịch · chạm để sửa hoặc xóa
      </Text>
      {!entries.length ? (
        <Card>
          <Empty />
        </Card>
      ) : (
        dates.map((date) => {
          const rows = entries.filter((e) => e.date === date),
            balance = totals(rows).balance;
          return (
            <View key={date} style={{ gap: 8 }}>
              <View style={st.row}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.muted,
                  }}
                >
                  {displayDate(date)}
                </Text>
                <Text style={st.tiny}>
                  {balance > 0 ? "+" : ""}
                  {money(balance)}
                </Text>
              </View>
              <Card>
                {rows.map((e, i) => (
                  <View key={e.id}>
                    {i > 0 && <View style={st.line} />}
                    <TransactionRow entry={e} />
                  </View>
                ))}
              </Card>
            </View>
          );
        })
      )}
    </Page>
  );
}
