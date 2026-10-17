import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  answerLedger,
  parseVoiceDraft,
  spokenAmount,
} from "../src/assistant-domain.ts";
import { emptyLedger } from "../src/domain.ts";
const today = "2026-10-17";
const data = emptyLedger();
data.entries = [
  {
    id: "salary",
    kind: "income",
    amount: 15000000,
    date: "2026-10-01",
    category: "Lương",
    note: "",
    member: "Bố",
    payment: "Chuyển khoản",
  },
  {
    id: "food",
    kind: "expense",
    amount: 250000,
    date: "2026-10-17",
    category: "Ăn uống",
    note: "Đi chợ",
    member: "Mẹ",
    payment: "Chuyển khoản",
  },
  {
    id: "electric",
    kind: "expense",
    amount: 500000,
    date: "2026-10-02",
    category: "Điện nước / Internet",
    note: "",
    member: "Bố",
    payment: "Chuyển khoản",
  },
  {
    id: "previous",
    kind: "expense",
    amount: 500000,
    date: "2026-09-02",
    category: "Ăn uống",
    note: "",
    member: "Mẹ",
    payment: "Tiền mặt",
  },
];
data.budgets["2026-10"] = { "Ăn uống": 200000, "Y tế": 0 };
test("Vietnamese voice amounts, decimal units, explicit integers and ambiguity", () => {
  for (const [text, amount] of [
    ["Đi chợ 250 nghìn", 250000],
    ["hai trăm năm mươi nghìn", 250000],
    ["mười lăm triệu", 15000000],
    ["1,5 triệu", 1500000],
    ["2 triệu 350 nghìn", 2350000],
    ["1 triệu rưỡi", 1500000],
    ["chi 250000 tiền ăn", 250000],
    ["35k", 35000],
    ["250.000 đồng", 250000],
  ] as const)
    assert.equal(spokenAmount(text), amount, text);
  for (const text of [
    "Ăn sáng 35",
    "ngày 16/10/2026",
    "chi 200 nghìn và 50 nghìn",
    "0 đồng",
    "1001 tỷ",
    "chi 250000 và 300000",
    "đi chợ ngày 16 tháng 10 năm 2026",
    "hai ba nghìn",
    "1 triệu 5",
    "chi 1 triệu và 200",
  ])
    assert.equal(spokenAmount(text), undefined, text);
});
test("Voice draft stays read-only and handles income, yesterday and exact custom categories", () => {
  const before = JSON.stringify(data);
  const parsed = parseVoiceDraft(
    "Hôm nay đi chợ 250 nghìn, chuyển khoản, mẹ chi",
    data,
    today,
  );
  assert.equal(parsed.amount, 250000);
  assert.equal(parsed.kind, "expense");
  assert.equal(parsed.category, "Ăn uống");
  assert.equal(parsed.date, today);
  assert.equal(parsed.member, "Mẹ");
  assert.equal(parsed.payment, "Chuyển khoản");
  const salary = parseVoiceDraft(
    "Hôm qua nhận lương mười lăm triệu chuyển khoản",
    data,
    "2026-01-01",
  );
  assert.equal(salary.kind, "income");
  assert.equal(salary.category, "Lương");
  assert.equal(salary.date, "2025-12-31");
  assert.equal(salary.amount, 15000000);
  const custom = emptyLedger();
  custom.categories.expense.push("Thú cưng");
  assert.equal(
    parseVoiceDraft("Chi 300 nghìn cho Thú cưng", custom, today).category,
    "Thú cưng",
  );
  const ambiguous = parseVoiceDraft("35", data, today);
  assert.equal(ambiguous.amount, undefined);
  assert.equal(ambiguous.kind, undefined);
  assert.ok(ambiguous.warnings.length);
  assert.equal(
    parseVoiceDraft("Chi 200 nghìn ngày 31 tháng 2 năm 2026", data, today).date,
    undefined,
  );
  assert.equal(
    parseVoiceDraft("Thu 5 triệu hôm nay", data, today).kind,
    "income",
  );
  assert.equal(
    parseVoiceDraft("Chi 100 nghìn, thành viên Nam", data, today).member,
    "Nam",
  );
  assert.equal(parseVoiceDraft("Ba chi 100 nghìn", data, today).member, "Ba");
  assert.equal(JSON.stringify(data), before);
});
test("Assistant computes real month totals, categories, members and relative comparison", () => {
  const ask = (q: string, month = "2026-10") =>
    answerLedger(q, data, month, today);
  assert.match(ask("Tháng này chi bao nhiêu?").text, /750\.000/);
  assert.match(ask("Tháng này thu nhập bao nhiêu?").text, /15\.000\.000/);
  assert.match(
    ask("Khoản chi nào nhiều nhất?").text,
    /Điện nước \/ Internet 500\.000/,
  );
  assert.match(ask("Mẹ chi bao nhiêu tháng này?").text, /250\.000/);
  assert.match(ask("Thu chi tháng 9 năm 2026").text, /500\.000/);
  assert.match(ask("Tháng này chi bao nhiêu?", "2026-09").text, /750\.000/);
  assert.match(ask("Tổng thu chi", "2026-09").text, /tháng 9\/2026/);
  const comparison = ask("So sánh chi tiêu với tháng trước");
  assert.match(comparison.text, /Tăng 250\.000/);
  assert.match(comparison.text, /50\.0%/);
  assert.match(ask("Ngân sách Ăn uống còn bao nhiêu?").text, /vượt 50\.000/);
});
test("Assistant declines unsupported scopes and never invents absent history or members", () => {
  for (const question of [
    "Hôm nay chi bao nhiêu?",
    "Chi tiêu tuần này",
    "Tháng 13 chi bao nhiêu?",
    "Xóa hết giao dịch",
    "Thời tiết hôm nay",
    "Bitcoin giá bao nhiêu?",
    "Hùng chi bao nhiêu?",
    "Thành viên Hùng chi bao nhiêu?",
    "So sánh tháng 8 với tháng 9",
  ])
    assert.equal(
      answerLedger(question, data, "2026-10", today).supported,
      false,
      question,
    );
  assert.match(
    answerLedger("So sánh chi tiêu với tháng trước", data, "2026-09", today)
      .text,
    /Chưa đủ/,
  );
  assert.match(
    answerLedger("Thu chi", emptyLedger(), "2026-10", today).text,
    /Chưa có giao dịch/,
  );
});
