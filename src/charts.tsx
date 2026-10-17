import React, { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, Rect, Text as SVGText, Line } from "react-native-svg";
import { annual, chartFocusMonth, money, type Kind } from "./domain";
import { colors, Empty, st } from "./ui";
import { categoryStyle } from "./category-visuals";
export function Donut({
  items,
  kind = "expense",
}: {
  items: { category: string; amount: number }[];
  kind?: Kind;
}) {
  const total = items.reduce((a, x) => a + x.amount, 0);
  if (!total)
    return <Empty text="Thêm giao dịch để xem cơ cấu theo danh mục." />;
  const circumference = 2 * Math.PI * 72;
  return (
    <View
      style={{
        gap: 16,
        flexDirection: "column",
        alignItems: "stretch",
      }}
    >
      <View
        accessibilityLabel={"Tổng cộng " + money(total)}
        style={{ alignItems: "center" }}
      >
        <Svg width={200} height={200} viewBox="0 0 200 200">
          <Circle
            cx={100}
            cy={100}
            r={72}
            stroke="#EDF0E9"
            strokeWidth={27}
            fill="none"
          />
          {items.map((item, i) => {
            const length = (item.amount / total) * circumference;
            const start =
              (items.slice(0, i).reduce((a, x) => a + x.amount, 0) / total) *
              circumference;
            return item.amount > 0 ? (
              <Circle
                key={item.category}
                cx={100}
                cy={100}
                r={72}
                fill="none"
                stroke={categoryStyle(item.category, kind).color}
                strokeWidth={27}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-start}
                transform="rotate(-90 100 100)"
              />
            ) : null;
          })}
          <SVGText
            fontFamily="Arial, sans-serif"
            x={100}
            y={97}
            textAnchor="middle"
            fontSize={12}
            fill={colors.muted}
          >
            TỔNG CỘNG
          </SVGText>
          <SVGText
            fontFamily="Arial, sans-serif"
            x={100}
            y={119}
            textAnchor="middle"
            fontWeight="bold"
            fontSize={14}
            fill={colors.ink}
          >
            {money(total)}
          </SVGText>
        </Svg>
      </View>
      <View style={{ width: "100%", gap: 14 }}>
        {items.map(
          (item) =>
            item.amount > 0 && (
              <View key={item.category} style={st.row}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: categoryStyle(item.category, kind).color,
                    }}
                  />
                  <Text style={{ color: colors.ink, flex: 1, fontSize: 13 }}>
                    {item.category}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  {
                    <Text
                      style={{
                        fontWeight: "600",
                        color: colors.ink,
                        fontSize: 13,
                      }}
                    >
                      {money(item.amount)}
                    </Text>
                  }
                  <Text style={st.tiny}>
                    {((item.amount / total) * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ),
        )}
      </View>
    </View>
  );
}
export function YearChart({
  rows,
  month,
}: {
  rows: ReturnType<typeof annual>;
  month: string;
}) {
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const focus = chartFocusMonth(rows, month);
  const focusChart = useCallback(() => {
    if (width > 0)
      scroll.current?.scrollTo({
        x: Math.max(
          0,
          Math.min(600 - width, 25 + (focus - 1) * 49 - width / 2),
        ),
        animated: false,
      });
  }, [focus, width]);
  useFocusEffect(focusChart);
  const maximum =
    Math.max(0, ...rows.flatMap((r) => [r.income, r.expense])) || 1e6;
  const ticks = [0, 0.5, 1].map((p) => ({
    p,
    label: ((maximum * p) / 1e6).toLocaleString("vi-VN", {
      maximumFractionDigits: maximum < 10000 ? 7 : 2,
    }),
  }));
  const axisWidth = Math.max(46, ...ticks.map((t) => t.label.length * 6 + 10));
  return (
    <View style={{ gap: 12 }}>
      <Text style={st.tiny}>
        Đơn vị: triệu đồng. Tự đưa tới tháng có dữ liệu, ưu tiên tháng hiện tại.
        Vuốt ngang để xem đủ 12 tháng.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={focusChart}
        style={{ alignSelf: "flex-start", paddingVertical: 6 }}
      >
        <Text style={{ color: colors.green, fontWeight: "600" }}>
          Về tháng {focus}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Svg
          width={axisWidth}
          height={230}
          style={{ flexShrink: 0 }}
          accessibilityLabel="Trục số tiền, đơn vị triệu đồng"
        >
          {ticks.map(({ p, label }) => (
            <SVGText
              key={p}
              fontFamily="Arial, sans-serif"
              x={axisWidth - 6}
              y={194 - p * 160}
              textAnchor="end"
              fill={colors.muted}
              fontSize={10}
            >
              {label}
            </SVGText>
          ))}
          <Line
            x1={axisWidth - 1}
            x2={axisWidth - 1}
            y1={30}
            y2={190}
            stroke={colors.line}
          />
        </Svg>
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onContentSizeChange={focusChart}
          style={{ flex: 1 }}
        >
          <Svg
            width={600}
            height={230}
            accessibilityLabel="Biểu đồ thu chi 12 tháng"
          >
            {[0, 0.5, 1].map((p) => (
              <Line
                key={p}
                x1={0}
                x2={600}
                y1={190 - p * 160}
                y2={190 - p * 160}
                stroke={colors.line}
              />
            ))}
            {rows.map((r, i) => (
              <React.Fragment key={r.month}>
                <Rect
                  x={9 + i * 49}
                  y={190 - (r.income / maximum) * 160}
                  width={15}
                  height={(r.income / maximum) * 160}
                  rx={3}
                  fill={colors.green}
                />
                <Rect
                  x={27 + i * 49}
                  y={190 - (r.expense / maximum) * 160}
                  width={15}
                  height={(r.expense / maximum) * 160}
                  rx={3}
                  fill={colors.orange}
                />
                <SVGText
                  fontFamily="Arial, sans-serif"
                  x={25 + i * 49}
                  y={214}
                  textAnchor="middle"
                  fontSize={11}
                  fill={colors.muted}
                >
                  T{r.month}
                </SVGText>
              </React.Fragment>
            ))}
          </Svg>
        </ScrollView>
      </View>
      <View style={{ flexDirection: "row", gap: 20 }}>
        <Text style={{ color: colors.green }}>● Thu nhập</Text>
        <Text style={{ color: colors.orange }}>● Chi tiêu</Text>
      </View>
    </View>
  );
}
