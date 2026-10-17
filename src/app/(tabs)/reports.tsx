import React, { useState } from "react";
import { Text, View } from "react-native";
import { annual, breakdown, money, monthEntries } from "../../domain";
import { useLedger } from "../../store";
import { Button, Card, Chips, colors, MonthPicker, Page, st } from "../../ui";
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
      <Button
        title="Hỏi trợ lý bằng giọng nói"
        onPress={() => router.push("/assistant")}
      />
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
