import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useLedger } from "../../store";
import { breakdown, money, monthEntries, totals } from "../../domain";
import { Card, colors, Empty, MonthPicker, Page, st } from "../../ui";
import { Donut } from "../../charts";
import { Icon } from "../../icon";
import {
  CategoryIcon,
  categoryStyle,
  TransactionRow,
} from "../../category-visuals";
export default function Home() {
  const { data, month } = useLedger();
  const entries = monthEntries(data, month),
    summary = totals(entries);
  const spending = breakdown(
    entries,
    "expense",
    data.categories.expense,
  ).filter((x) => x.amount > 0);
  const budgets = Object.entries(data.budgets[month] ?? {});
  return (
    <Page
      title="Nếp Nhà"
      subtitle="Gọn thu chi, nhẹ chuyện tiền nhà."
      addAction
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ghi thu chi bằng giọng nói"
        onPress={() => router.push("/entry?voice=1")}
        style={{
          backgroundColor: colors.green,
          borderRadius: 22,
          padding: 20,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", gap: 13, alignItems: "center" }}>
          <View
            style={{
              backgroundColor: "#FFFFFF24",
              padding: 14,
              borderRadius: 20,
            }}
          >
            <Icon name="mic" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "700",
                fontSize: 18,
                lineHeight: 25,
              }}
            >
              Ghi thu chi bằng giọng nói
            </Text>
            <Text style={{ color: "#E6F2EB", fontSize: 12, lineHeight: 19 }}>
              Nói một câu · kiểm tra · bấm Lưu
            </Text>
          </View>
        </View>
        <Text style={{ color: "#E6F2EB", fontSize: 13, lineHeight: 21 }}>
          “Hôm nay đi chợ 250 nghìn, chuyển khoản, mẹ chi”
        </Text>
      </Pressable>
      <Card>
        <MonthPicker />
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 12 }}>
          <Text
            style={{ fontSize: 11, letterSpacing: 1.4, color: colors.muted }}
          >
            CÒN LẠI TRONG THÁNG
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: 35,
              fontWeight: "700",
              letterSpacing: -1,
              color: colors.ink,
            }}
          >
            {money(summary.balance)}
          </Text>
          <Text style={[st.tiny, { textAlign: "center" }]}>
            Thu nhập trừ chi tiêu · chưa gồm số dư đầu kỳ
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["income", "expense"] as const).map((kind) => (
            <View
              key={kind}
              style={{
                flex: 1,
                padding: 14,
                gap: 8,
                borderRadius: 15,
                backgroundColor: kind === "income" ? colors.mint : colors.rose,
              }}
            >
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <Icon
                  name={
                    kind === "income"
                      ? "arrow-down-outline"
                      : "arrow-up-outline"
                  }
                  size={15}
                  color={kind === "income" ? colors.green : colors.orange}
                />
                <Text style={st.tiny}>
                  {kind === "income" ? "Thu nhập" : "Chi tiêu"}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: kind === "income" ? colors.green : colors.orange,
                }}
              >
                {money(summary[kind])}
              </Text>
            </View>
          ))}
        </View>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở trợ lý thu chi"
        onPress={() => router.push("/assistant")}
      >
        <Card>
          <View style={st.row}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: colors.mint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="mic" color={colors.green} size={23} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.heading}>Trợ lý thu chi</Text>
              <Text style={st.tiny}>
                Nói để hỏi về chi tiêu, thu nhập và ngân sách.
              </Text>
            </View>
            <Icon name="chevron-forward" color={colors.green} size={19} />
          </View>
        </Card>
      </Pressable>
      <Card>
        <View style={st.row}>
          <Text style={st.heading}>Tiền đang đi đâu?</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/reports")}
          >
            <Text style={{ color: colors.green, fontSize: 13 }}>Chi tiết</Text>
          </Pressable>
        </View>
        <Donut items={spending} />
        {spending.length > 0 && (
          <Text style={st.tiny}>
            {[...spending].sort((a, b) => b.amount - a.amount)[0].category} là
            khoản chi lớn nhất trong tháng.
          </Text>
        )}
      </Card>
      <Card>
        <View style={st.row}>
          <Text style={st.heading}>Ngân sách của nhà</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/budget")}
          >
            <Text style={{ color: colors.green, fontSize: 13 }}>Quản lý</Text>
          </Pressable>
        </View>
        {budgets.length === 0 ? (
          <Text style={st.subtitle}>
            Đặt hạn mức để theo dõi chi tiêu trong tháng.
          </Text>
        ) : (
          budgets.slice(0, 3).map(([name, limit]) => {
            const amount =
                spending.find((x) => x.category === name)?.amount ?? 0,
              appearance = categoryStyle(name);
            return (
              <View key={name} style={{ gap: 10 }}>
                <View style={st.row}>
                  <CategoryIcon name={name} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        fontWeight: "600",
                        fontSize: 13,
                        color: colors.ink,
                      }}
                    >
                      {name}
                    </Text>
                    <Text style={st.tiny}>
                      {money(amount)} / {money(limit)}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    height: 5,
                    borderRadius: 4,
                    backgroundColor: colors.line,
                  }}
                >
                  <View
                    style={{
                      height: 5,
                      borderRadius: 4,
                      width: `${Math.min(100, limit ? (amount / limit) * 100 : amount ? 100 : 0)}%`,
                      backgroundColor:
                        amount > limit ? colors.orange : appearance.color,
                    }}
                  />
                </View>
                {amount > limit && (
                  <Text style={{ fontSize: 12, color: colors.orange }}>
                    Vượt {money(amount - limit)}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </Card>
      <Card>
        <View style={st.row}>
          <Text style={st.heading}>Gần đây</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/transactions")}
          >
            <Text style={{ color: colors.green, fontSize: 13 }}>
              Xem tất cả
            </Text>
          </Pressable>
        </View>
        {entries.length ? (
          entries
            .slice(0, 5)
            .map((e) => <TransactionRow key={e.id} entry={e} showDate />)
        ) : (
          <Empty />
        )}
      </Card>
      <Card>
        <Text style={st.heading}>Các nguồn thu</Text>
        {summary.income ? (
          breakdown(entries, "income", data.categories.income)
            .filter((x) => x.amount > 0)
            .map((x) => (
              <View key={x.category} style={st.row}>
                <CategoryIcon name={x.category} kind="income" />
                <Text style={[st.subtitle, { flex: 1 }]}>{x.category}</Text>
                <Text style={{ color: colors.green, fontWeight: "600" }}>
                  {money(x.amount)}
                </Text>
              </View>
            ))
        ) : (
          <Text style={st.subtitle}>
            Ghi nhận lương, thưởng và các khoản thu khác.
          </Text>
        )}
      </Card>
    </Page>
  );
}
