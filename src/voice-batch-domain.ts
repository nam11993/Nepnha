import {
  type Entry,
  type Ledger,
  type Kind,
  displayDate,
  localDate,
  parseAmount,
  parseDate,
  payments,
  validateLedger,
} from "./domain.ts";
import type { BatchVoiceDraft } from "./ai-contract.ts";
export type ReviewRow = {
  key: string;
  source: string;
  warnings: string[];
  kind: Kind | "";
  amount: string;
  date: string;
  category: string;
  note: string;
  member: string;
  payment: string;
};
export function reviewRows(
  drafts: BatchVoiceDraft[],
  today = localDate(),
): ReviewRow[] {
  return drafts.map((d, i) => ({
    key: String(i),
    source: d.source,
    warnings: [
      ...d.warnings.map((w) =>
        !d.date && w.includes("Biểu mẫu giữ ngày")
          ? "Chưa nêu ngày: tạm dùng hôm nay, bạn có thể sửa."
          : w,
      ),
      ...(!d.payment
        ? ["Chưa nêu thanh toán: tạm chọn Tiền mặt, bạn có thể sửa."]
        : []),
    ],
    kind: d.kind ?? "",
    amount: d.amount === undefined ? "" : String(d.amount),
    date: displayDate(d.date ?? today),
    category: d.category ?? "",
    note: d.note ?? "",
    member: d.member ?? "",
    payment: d.payment ?? payments[0],
  }));
}
// Validate the whole batch before one save. No partial writes or model-generated IDs.
export function appendVoiceBatch(
  ledger: Ledger,
  rows: ReviewRow[],
  newId: () => string,
): Ledger {
  if (!rows.length || rows.length > 8)
    throw Error("Cần từ 1 đến 8 giao dịch để lưu.");
  const entries: Entry[] = rows.map((r, i) => {
    if (!r.kind || !ledger.categories[r.kind].includes(r.category))
      throw Error(`Khoản ${i + 1}: hãy chọn loại và danh mục.`);
    try {
      return {
        id: newId(),
        kind: r.kind,
        amount: parseAmount(r.amount),
        date: parseDate(r.date),
        category: r.category,
        note: r.note.trim(),
        member: r.member.trim(),
        payment: r.payment,
      };
    } catch (e) {
      throw Error(`Khoản ${i + 1}: ${(e as Error).message}`);
    }
  });
  return validateLedger({
    ...ledger,
    entries: [...ledger.entries, ...entries],
  });
}
