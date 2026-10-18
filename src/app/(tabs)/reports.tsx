import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { annual, breakdown, money, monthEntries, totals } from "../../domain";
import { useLedger } from "../../store";
import { Card, Chips, colors, MonthPicker, Page, st, Metric } from "../../ui";
import { Icon } from "../../icon";
import { router } from "expo-router";
import { Donut, YearChart } from "../../charts";
import { ReportYearPicker } from "../../report-year-picker";
export default function Reports() {
  const { data, month } = useLedger(),
    [kind, setKind] = useState("Chi tiêu"),
    [chosenYear, setChosenYear] = useState<string | null>(null),
    entries = monthEntries(data, month),
    reportYear = chosenYear ?? month.slice(0, 4),
    year = annual(data, reportYear),
    populatedMonths = year.filter((r) => r.income > 0 || r.expense > 0);
  return (
    <Page title="Báo cáo" subtitle="Nhìn rõ tiền đến từ đâu và đi về đâu.">
      <MonthPicker />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hỏi trợ lý bằng giọng nói"
        onPress={() => router.push("/assistant")}
        style={{
          padding: 14,
          borderRadius: 16,
          backgroundColor: colors.lavender,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon name="mic" color={colors.violet} size={20} />
        <Text style={{ color: colors.violet, fontSize: 13, fontWeight: "600" }}>
          Hỏi trợ lý bằng giọng nói
        </Text>
      </Pressable>
      <Card>
        <Text style={st.heading}>
          Bức tranh tháng {Number(month.slice(5))} / {month.slice(0, 4)}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              padding: 13,
              backgroundColor: colors.mint,
              borderRadius: 16,
            }}
          >
            <Metric
              label="Thu nhập"
              value={totals(entries).income}
              color={colors.green}
            />
          </View>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              padding: 13,
              backgroundColor: colors.rose,
              borderRadius: 16,
            }}
          >
            <Metric
              label="Chi tiêu"
              value={totals(entries).expense}
              color={colors.orange}
            />
          </View>
        </View>
      </Card>
      <Card>
        <Text style={st.heading}>Cơ cấu trong tháng</Text>
        <Chips
          items={["Chi tiêu", "Thu nhập"]}
          value={kind}
          onChange={setKind}
        />
        <Donut
          kind={kind === "Thu nhập" ? "income" : "expense"}
          items={breakdown(
            entries,
            kind === "Thu nhập" ? "income" : "expense",
            data.categories[kind === "Thu nhập" ? "income" : "expense"],
          )}
        />
      </Card>
      <Card>
        <Text style={st.heading}>12 tháng năm {reportYear}</Text>
        <ReportYearPicker
          value={reportYear}
          years={data.entries.map((e) => e.date.slice(0, 4))}
          onChange={setChosenYear}
        />
        <YearChart
          key={reportYear}
          rows={year}
          month={`${reportYear}-${month.slice(5)}`}
        />
        <Text style={st.tiny}>
          Tháng chưa ghi nhận giao dịch được tính là 0.
        </Text>
      </Card>
      <Card>
        <Text style={st.heading}>Chi tiết theo tháng · {reportYear}</Text>
        <ReportYearPicker
          value={reportYear}
          years={data.entries.map((e) => e.date.slice(0, 4))}
          onChange={setChosenYear}
        />
        {populatedMonths.length === 0 && (
          <Text style={st.subtitle}>Năm {reportYear} chưa có giao dịch.</Text>
        )}
        {populatedMonths.map((r) => (
          <View
            key={r.month}
            style={{
              gap: 7,
              paddingVertical: 9,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}
          >
            <View style={st.row}>
              <Text style={{ fontWeight: "600", color: colors.ink }}>
                Tháng {r.month} / {reportYear}
              </Text>
              <Text style={st.tiny}>Còn lại {money(r.balance)}</Text>
            </View>
            <View style={st.row}>
              <Text style={{ color: colors.green, fontSize: 13 }}>
                Thu {money(r.income)}
              </Text>
              <Text style={{ color: colors.orange, fontSize: 13 }}>
                Chi {money(r.expense)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Page>
  );
}
