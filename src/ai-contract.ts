import {
  type Ledger,
  type Kind,
  type Entry,
  validDate,
  money,
  totals,
  breakdown,
  validateLedger,
} from "./domain.ts";
import { fold, spokenAmount, type VoiceDraft } from "./assistant-domain.ts";
export const AI_MODEL = "gpt-6-luna";
const nullableText = { type: ["string", "null"] };
export const draftSchema = {
  type: "object",
  properties: {
    kind: { type: ["string", "null"], enum: ["income", "expense", null] },
    amount: { type: ["integer", "null"] },
    date: nullableText,
    category: nullableText,
    payment: nullableText,
    member: nullableText,
    note: { type: "string" },
    clarification: { type: "string" },
  },
  required: [
    "kind",
    "amount",
    "date",
    "category",
    "payment",
    "member",
    "note",
    "clarification",
  ],
  additionalProperties: false,
};
export const batchDraftSchema = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      maxItems: 8,
      items: {
        ...draftSchema,
        properties: {
          ...draftSchema.properties,
          source: { type: "string" },
          amountText: nullableText,
        },
        required: [...draftSchema.required, "source", "amountText"],
      },
    },
    clarification: { type: "string" },
  },
  required: ["transactions", "clarification"],
  additionalProperties: false,
};
export type BatchVoiceDraft = VoiceDraft & { source: string };
export function validateAIBatch(
  raw: unknown,
  ledger: Ledger,
  text: string,
): { drafts: BatchVoiceDraft[]; clarification: string } {
  if (!raw || typeof raw !== "object") throw Error("invalid_ai_output");
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.transactions) || r.transactions.length > 8)
    throw Error("invalid_ai_batch");
  const normalize = (s: string) => fold(s).replace(/\s+/g, " ").trim();
  const original = normalize(text);
  let cursor = 0;
  const drafts = r.transactions.map((item: unknown) => {
    if (!item || typeof item !== "object") throw Error("invalid_ai_output");
    const d = item as Record<string, unknown>;
    const source = typeof d.source === "string" ? d.source.trim() : "";
    const at = original.indexOf(normalize(source), cursor);
    // Every item must refer to a distinct, ordered clause actually spoken by the user.
    if (!source || at < 0) throw Error("invalid_ai_source");
    cursor = at + normalize(source).length;
    const draft = validateAIDraft(d, ledger);
    const amountText =
      typeof d.amountText === "string" ? d.amountText.trim() : "";
    const grounded =
      amountText && normalize(source).includes(normalize(amountText))
        ? spokenAmount(amountText)
        : undefined;
    if (
      draft.amount !== undefined &&
      (grounded === undefined || grounded !== draft.amount)
    ) {
      delete draft.amount;
      draft.warnings.push(
        "Số tiền chưa khớp lời nói. Hãy nhập lại, không dùng số AI suy đoán.",
      );
    }
    return { ...draft, source };
  });
  return {
    drafts,
    clarification:
      typeof r.clarification === "string" ? r.clarification.slice(0, 300) : "",
  };
}
export const questionSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["summary", "top", "budget", "compare", "clarify"],
    },
    from: { type: "string" },
    to: { type: "string" },
    compareFrom: nullableText,
    compareTo: nullableText,
    kind: { type: "string", enum: ["income", "expense", "all"] },
    category: nullableText,
    member: nullableText,
    clarification: { type: "string" },
  },
  required: [
    "intent",
    "from",
    "to",
    "compareFrom",
    "compareTo",
    "kind",
    "category",
    "member",
    "clarification",
  ],
  additionalProperties: false,
};
export function aiMetadata(ledger: Ledger) {
  return {
    categories: ledger.categories,
    members: [
      ...new Set(ledger.entries.map((e) => e.member).filter(Boolean)),
    ].slice(0, 100),
    months: [...new Set(ledger.entries.map((e) => e.date.slice(0, 7)))].sort(),
  };
}
export function validateAIDraft(raw: unknown, ledger: Ledger): VoiceDraft {
  if (!raw || typeof raw !== "object") throw Error("invalid_ai_output");
  const r = raw as Record<string, unknown>,
    warnings: string[] = [];
  const result: VoiceDraft = { warnings };
  if (r.kind === "income" || r.kind === "expense") result.kind = r.kind;
  else
    warnings.push("Chưa rõ khoản thu hay khoản chi. Hãy chọn trong biểu mẫu.");
  if (
    typeof r.amount === "number" &&
    Number.isSafeInteger(r.amount) &&
    r.amount > 0 &&
    r.amount <= 1e12
  )
    result.amount = r.amount;
  else warnings.push("Chưa rõ số tiền. Hãy nhập lại trong biểu mẫu.");
  if (typeof r.date === "string" && validDate(r.date)) result.date = r.date;
  else warnings.push("Chưa rõ ngày. Biểu mẫu giữ ngày đang chọn.");
  if (
    result.kind &&
    typeof r.category === "string" &&
    ledger.categories[result.kind].includes(r.category)
  )
    result.category = r.category;
  else warnings.push("Hãy kiểm tra lại danh mục trong biểu mẫu.");
  if (
    typeof r.payment === "string" &&
    ["Tiền mặt", "Chuyển khoản", "Thẻ", "Ví điện tử"].includes(r.payment)
  )
    result.payment = r.payment;
  if (typeof r.member === "string" && r.member.length <= 80)
    result.member = r.member;
  if (typeof r.note === "string") result.note = r.note.slice(0, 300);
  if (typeof r.clarification === "string" && r.clarification)
    warnings.push(r.clarification.slice(0, 300));
  return result;
}
type QueryPlan = {
  intent: "summary" | "top" | "budget" | "compare" | "clarify";
  from: string;
  to: string;
  compareFrom: string | null;
  compareTo: string | null;
  kind: Kind | "all";
  category: string | null;
  member: string | null;
  clarification: string;
};
function validatePlan(raw: unknown, ledger: Ledger): QueryPlan {
  if (!raw || typeof raw !== "object") throw Error("invalid_ai_output");
  const r = raw as QueryPlan;
  if (
    !["summary", "top", "budget", "compare", "clarify"].includes(r.intent) ||
    !["income", "expense", "all"].includes(r.kind)
  )
    throw Error("invalid_ai_output");
  if (r.intent === "clarify")
    return {
      ...r,
      clarification:
        typeof r.clarification === "string"
          ? r.clarification.slice(0, 400)
          : "Bạn hãy nói rõ câu hỏi về thu chi.",
    };
  const range = (a: unknown, b: unknown) =>
    typeof a === "string" &&
    typeof b === "string" &&
    validDate(a) &&
    validDate(b) &&
    a <= b;
  if (
    !range(r.from, r.to) ||
    (r.intent === "compare" && !range(r.compareFrom, r.compareTo))
  )
    throw Error("invalid_ai_dates");
  if (
    r.category !== null &&
    (typeof r.category !== "string" ||
      ![...ledger.categories.income, ...ledger.categories.expense].includes(
        r.category,
      ))
  )
    throw Error("unknown_ai_category");
  if (
    r.member !== null &&
    (typeof r.member !== "string" ||
      !ledger.entries.some((e) => e.member === r.member))
  )
    throw Error("unknown_ai_member");
  return r;
}
export function answerAIPlan(raw: unknown, ledger: Ledger) {
  const plan = validatePlan(raw, ledger);
  if (plan.intent === "clarify")
    return { text: plan.clarification, supported: false, scope: null };
  const scope = `${plan.from.split("-").reverse().join("/")} – ${plan.to.split("-").reverse().join("/")}${plan.category ? " · " + plan.category : ""}${plan.member ? " · " + plan.member : ""}`;
  const select = (from: string, to: string): Entry[] =>
    ledger.entries.filter(
      (e) =>
        e.date >= from &&
        e.date <= to &&
        (!plan.category || e.category === plan.category) &&
        (!plan.member || e.member === plan.member) &&
        (plan.kind === "all" || e.kind === plan.kind),
    );
  const entries = select(plan.from, plan.to),
    summary = totals(entries);
  let text = "";
  if (plan.intent === "budget") {
    if (plan.from.slice(0, 7) !== plan.to.slice(0, 7) || plan.member)
      return {
        text: "Ngân sách hiện chỉ đặt theo danh mục cho cả tháng và cả gia đình. Bạn hãy hỏi một tháng, không lọc thành viên.",
        supported: false,
        scope,
      };
    const month = plan.from.slice(0, 7),
      limits = Object.entries(ledger.budgets[month] ?? {}).filter(
        ([name]) => !plan.category || name === plan.category,
      );
    const actual = ledger.entries.filter((e) => e.date.startsWith(month + "-"));
    const spent = breakdown(actual, "expense", ledger.categories.expense);
    text = limits.length
      ? "Hạn mức cả tháng " +
        Number(month.slice(5)) +
        "/" +
        month.slice(0, 4) +
        ":\n" +
        limits
          .map(([name, limit]) => {
            const amount = spent.find((x) => x.category === name)?.amount ?? 0;
            return `${name}: đã chi ${money(amount)} / ${money(limit)}; ${amount > limit ? "vượt " + money(amount - limit) : "còn " + money(limit - amount)}.`;
          })
          .join("\n")
      : "Chưa đặt ngân sách cho tháng và danh mục này.";
  } else if (plan.intent === "compare") {
    const previous = select(plan.compareFrom!, plan.compareTo!);
    if (!entries.length || !previous.length)
      text =
        "Chưa đủ giao dịch ở cả hai khoảng để so sánh. Khoảng chưa ghi dữ liệu không có nghĩa là thực tế không thu chi.";
    else {
      const before = totals(previous),
        beforeScope = `${plan.compareFrom} – ${plan.compareTo}`;
      text = (
        plan.kind === "all" ? (["income", "expense"] as const) : [plan.kind]
      )
        .map((k) => {
          const delta = summary[k] - before[k];
          return `${k === "income" ? "Thu" : "Chi"}: ${money(summary[k])}; kỳ đối chiếu ${beforeScope}: ${money(before[k])}. ${delta === 0 ? "Không đổi" : (delta > 0 ? "Tăng " : "Giảm ") + money(Math.abs(delta)) + (before[k] ? ` (${((Math.abs(delta) / before[k]) * 100).toFixed(1)}%)` : "")}.`;
        })
        .join("\n");
    }
  } else if (!entries.length)
    text = "Chưa có giao dịch đã ghi trong phạm vi này.";
  else if (plan.intent === "top") {
    const kind = plan.kind === "income" ? "income" : "expense",
      rows = breakdown(entries, kind, ledger.categories[kind])
        .filter((x) => x.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
    text = rows.length
      ? `${kind === "income" ? "Nguồn thu" : "Khoản chi"} lớn nhất:\n` +
        rows
          .map(
            (x) =>
              `${x.category}: ${money(x.amount)} (${((x.amount / summary[kind]) * 100).toFixed(1)}%).`,
          )
          .join("\n")
      : "Chưa có khoản " +
        (kind === "income" ? "thu" : "chi") +
        " trong phạm vi này.";
  } else
    text =
      plan.kind === "all"
        ? `Thu ${money(summary.income)}, chi ${money(summary.expense)}, chênh lệch thu–chi ${money(summary.balance)}. Có ${entries.length} giao dịch đã ghi; chưa gồm số dư đầu kỳ.`
        : `${plan.kind === "income" ? "Thu" : "Chi"} ${money(summary[plan.kind])}, từ ${entries.length} giao dịch đã ghi.`;
  return { text: `${scope}\n${text}`, supported: true, scope };
}
export function checkedCloudLedger(value: unknown): Ledger {
  return validateLedger(value);
}
