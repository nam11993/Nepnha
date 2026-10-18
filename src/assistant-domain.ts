import {
  type Entry,
  type Kind,
  type Ledger,
  breakdown,
  localDate,
  money,
  monthEntries,
  shiftMonth,
  totals,
  validDate,
} from "./domain.ts";
export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
export type VoiceDraft = Partial<Omit<Entry, "id">> & { warnings: string[] };
const digits: Record<string, number> = {
  khong: 0,
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  tu: 4,
  nam: 5,
  lam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
};
function underThousand(text: string): number | undefined {
  const raw = text.trim();
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(raw))
    return Number(raw.replace(/[.,]/g, ""));
  if (/^\d+(?:[.,]\d+)?$/.test(raw)) return Number(raw.replace(",", "."));
  const tokens = raw.split(/\s+/);
  if (
    !tokens.length ||
    tokens.some(
      (t) => !(t in digits) && !["tram", "muoi", "linh", "le"].includes(t),
    )
  )
    return;
  let total = 0,
    value = 0;
  let previousDigit = false;
  for (const token of tokens) {
    if (token in digits) {
      if (previousDigit) return;
      value += digits[token];
      previousDigit = true;
    } else if (token === "tram") {
      total += (value || 1) * 100;
      value = 0;
      previousDigit = false;
    } else if (token === "muoi") {
      total += (value || 1) * 10;
      value = 0;
      previousDigit = false;
    }
  }
  return total + value;
}
const wordNumber =
  "(?:khong|mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin|tram|muoi|linh|le)";
function normalizeCurrencySlang(input: string): string {
  // Preserve accents and require an amount boundary: "cũ" and "củ khoai"
  // must not become money units. Support both written and numeric numbers.
  return input
    .normalize("NFC")
    .replace(
      /(\d+(?:[.,]\d+)*|[\p{L}]+)\s*(củ|tỏi|ca)(?=\s*(?:$|[,.!?;]|rưỡi\b|\d+\s*(?:nghìn|ngàn|k\b)))/giu,
      (
        match,
        number: string,
        unit: string,
        offset: number,
        original: string,
      ) => {
        if (underThousand(fold(number)) === undefined) return match;
        if (
          unit.toLowerCase() === "ca" &&
          /\b(?:lam|truc|tang|chia)\s*$/.test(fold(original.slice(0, offset)))
        )
          return match;
        const replacement = { củ: "triệu", tỏi: "tỷ", ca: "nghìn" }[
          unit.toLowerCase()
        ];
        return number + " " + replacement;
      },
    );
}
export function slangMoneyAmount(input: string): number | undefined {
  if (normalizeCurrencySlang(input) !== input.normalize("NFC"))
    return spokenAmount(input);
}
export function spokenAmount(input: string): number | undefined {
  const text = fold(normalizeCurrencySlang(input))
    // Dictation may separate digits: "1 5 6k". Only join single digits
    // immediately followed by a money unit; never join dates or separate clauses.
    .replace(
      /\b\d(?:\s+\d){1,5}\s*(?=k\b|nghin\b|ngan\b|trieu\b|ty\b|dong\b|vnd\b|₫)/g,
      (digits) => digits.replace(/\s+/g, ""),
    )
    .replace(/₫/g, " dong ")
    .replace(/(\d)\s*k\b/g, "$1 nghin")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, " ")
    .replace(/\b(?:ngay|thang|nam)\s+\d{1,4}\b/g, " ");
  const pattern = new RegExp(
    `((?:\\d+(?:[.,]\\d+)*|${wordNumber}(?:\\s+${wordNumber})*))\\s*(ty|trieu|nghin|ngan|dong|vnd)\\b(?:\\s+(ruoi))?`,
    "g",
  );
  const matches = [...text.matchAll(pattern)];
  let total = 0;
  if (matches.length) {
    if (/\d/.test(text.replace(pattern, " "))) return;
    // Only a descending sequence such as "2 triệu 350 nghìn" is one amount.
    let lastUnit = Infinity;
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i],
        unit = { ty: 1e9, trieu: 1e6, nghin: 1e3, ngan: 1e3, dong: 1, vnd: 1 }[
          match[2]
        ]!;
      if (
        unit >= lastUnit ||
        (i &&
          !/^\s*$/.test(
            text.slice(
              matches[i - 1].index! + matches[i - 1][0].length,
              match.index,
            ),
          ))
      )
        return;
      const number = underThousand(match[1]);
      if (number === undefined) return;
      total += (number + (match[3] ? 0.5 : 0)) * unit;
      lastUnit = unit;
    }
  } else {
    // Bare short numbers are ambiguous. Dates and large ungrouped numbers are not money guesses.
    const bare = text.match(/\b(?:\d{1,3}(?:[.,]\d{3})+|\d{4,13})\b/g);
    if (bare?.length !== 1) return;
    total = Number(bare[0].replace(/[.,]/g, ""));
  }
  const rounded = Math.round(total);
  return Math.abs(rounded - total) < 0.001 && rounded > 0 && rounded <= 1e12
    ? rounded
    : undefined;
}
// An unusual dictation grouping is a suggestion for the review screen,
// not a change to ordinary amount parsing ("15 6000" could mean 15 items).
export function spacedMoneySuggestion(
  input: string,
): { amount: number; warning: string } | undefined {
  const text = fold(input).trim();
  const match =
    /\b([1-9]\d{0,7})\s+([1-9]000)(?:\s*(?:dong|vnd|₫))?[.!?]?$/u.exec(text);
  if (!match || /\d/.test(text.slice(0, match.index))) return;
  const amount = Number(match[1] + match[2]);
  if (!Number.isSafeInteger(amount) || amount > 1e12) return;
  return {
    amount,
    warning: `Lời nói tách số “${match[1]} ${match[2]}”: tạm ghép thành ${money(amount)}. Hãy xác nhận số tiền trước khi lưu.`,
  };
}
const aliases: [string, string[]][] = [
  [
    "Ăn uống",
    [
      "di cho",
      "an sang",
      "an trua",
      "an toi",
      "ca phe",
      "thuc pham",
      "sieu thi",
    ],
  ],
  ["Nhà ở", ["tien nha", "thue nha"]],
  ["Điện nước / Internet", ["tien dien", "tien nuoc", "internet", "wifi"]],
  ["Đi lại", ["do xang", "xang xe", "taxi", "grab", "gui xe"]],
  ["Con cái / học tập", ["hoc phi", "tien hoc", "sach vo"]],
  ["Y tế", ["kham benh", "thuoc", "benh vien"]],
  ["Mua sắm", ["quan ao", "giay dep", "mua sam"]],
  ["Giải trí / du lịch", ["du lich", "xem phim"]],
  ["Hiếu hỉ / biếu tặng", ["dam cuoi", "bieu tang"]],
  ["Lương", ["luong"]],
  ["Thưởng", ["thuong"]],
  ["Kinh doanh / làm thêm", ["lam them", "ban hang", "kinh doanh"]],
];
export function parseVoiceDraft(
  input: string,
  ledger: Ledger,
  today = localDate(),
): VoiceDraft {
  const text = fold(input),
    warnings: string[] = [];
  const draft: VoiceDraft = { warnings, note: input.trim().slice(0, 300) };
  const income =
    /\bthu\b/i.test(input) ||
    /\b(nhan luong|luong|thuong|khoan thu|thu nhap|nhan tien|duoc tang|ban hang)\b/.test(
      text,
    );
  const expense =
    /\b(khoan chi|chi|tra|thanh toan|mua|di cho|an sang|an trua|an toi|do xang|tien dien|tien nuoc|hoc phi|tien nha|kham benh)\b/.test(
      text,
    );
  if (income !== expense) draft.kind = income ? "income" : "expense";
  else
    warnings.push(
      "Chưa rõ khoản thu hay khoản chi. Hãy chọn lại trong biểu mẫu.",
    );
  draft.amount = spokenAmount(input);
  if (draft.amount === undefined)
    warnings.push(
      "Chưa rõ số tiền hoặc có nhiều khoản. Hãy nói một giao dịch, ví dụ “250 nghìn”.",
    );
  const calendar =
    /\b(?:ngay\s+)?(\d{1,2})\s*(?:\/|-|thang)\s*(\d{1,2})(?:\s*(?:\/|-|nam)\s*(\d{4}))?\b/.exec(
      text,
    );
  if (calendar) {
    const date = `${calendar[3] || today.slice(0, 4)}-${calendar[2].padStart(2, "0")}-${calendar[1].padStart(2, "0")}`;
    if (validDate(date)) draft.date = date;
    else warnings.push("Ngày được đọc không hợp lệ. Hãy chọn lại trên lịch.");
  } else if (/\bhom qua\b/.test(text)) {
    const [y, m, d] = today.split("-").map(Number);
    draft.date = localDate(new Date(y, m - 1, d - 1));
  } else if (/\bhom nay\b/.test(text)) draft.date = today;
  else warnings.push("Chưa nêu ngày: biểu mẫu giữ ngày đang chọn.");
  if (/\bchuyen khoan\b/.test(text)) draft.payment = "Chuyển khoản";
  else if (/\btien mat\b/.test(text)) draft.payment = "Tiền mặt";
  else if (/\bvi dien tu|momo|zalopay\b/.test(text))
    draft.payment = "Ví điện tử";
  else if (/\bthe\b/.test(text)) draft.payment = "Thẻ";
  if (draft.kind) {
    const names = ledger.categories[draft.kind];
    const matches = names.filter(
      (name) =>
        text.includes(fold(name)) ||
        aliases.some(
          ([n, words]) => n === name && words.some((w) => text.includes(w)),
        ),
    );
    if (matches.length === 1) draft.category = matches[0];
    else
      warnings.push(
        "Chưa xác định chắc danh mục. Hãy kiểm tra danh mục trong biểu mẫu.",
      );
  }
  const member = /(?:thanh vien|nguoi (?:chi|thu))\s+([^,.!?;]+)/i.exec(text);
  if (member)
    draft.member = input
      .slice(
        member.index + member[0].indexOf(member[1]),
        member.index + member[0].length,
      )
      .trim()
      .slice(0, 80);
  else {
    const family =
      /\b(bo|me|vo|chong|ong|ba)\s+(?:chi|thu|tra|thanh toan)\b/.exec(text);
    if (family) {
      const name = input.slice(family.index, family.index + family[1].length);
      draft.member = name.charAt(0).toLocaleUpperCase("vi") + name.slice(1);
    }
  }
  return draft;
}
export type AssistantReply = { text: string; supported: boolean };
const labelMonth = (month: string) =>
  `tháng ${Number(month.slice(5))}/${month.slice(0, 4)}`;
export function answerLedger(
  question: string,
  ledger: Ledger,
  selectedMonth: string,
  today = localDate(),
): AssistantReply {
  const q = fold(question).trim(),
    current = today.slice(0, 7);
  const reply = (text: string, supported = true): AssistantReply => ({
    text,
    supported,
  });
  if (!q) return reply("Hãy nói hoặc nhập câu hỏi về thu chi.", false);
  if (/\b(xoa|sua|them|chuyen tien|thanh toan ho)\b/.test(q))
    return reply(
      "Trợ lý chỉ đọc số liệu. Để thêm hoặc sửa, hãy dùng màn hình Giao dịch; mọi giao dịch đều cần bạn kiểm tra và bấm Lưu.",
      false,
    );
  if (
    /\b(nam nay|nam ngoai|tuan|quy|hom nay|hom qua|ngay|tu thang|den thang|gan day)\b/.test(
      q,
    )
  )
    return reply(
      "Hiện tôi tổng hợp theo từng tháng. Hãy hỏi “tháng này”, “tháng trước” hoặc “tháng 10 năm 2026”.",
      false,
    );
  const comparing = /\b(so voi|so sanh|tang|giam)\b/.test(q);
  let month = /\bthang nay\b/.test(q)
    ? current
    : /\bthang truoc\b/.test(q) && !comparing
      ? shiftMonth(current, -1)
      : selectedMonth;
  const explicit = /\bthang\s+(\d{1,2})(?:\s*(?:\/|nam)\s*(\d{4}))?\b/.exec(q);
  if (explicit) {
    if (
      +explicit[1] < 1 ||
      +explicit[1] > 12 ||
      (explicit[2] && (+explicit[2] < 2000 || +explicit[2] > 2100))
    )
      return reply(
        "Tháng không hợp lệ. Hãy chọn từ tháng 1 đến tháng 12, năm 2000–2100.",
        false,
      );
    month = `${explicit[2] || selectedMonth.slice(0, 4)}-${explicit[1].padStart(2, "0")}`;
  }
  if ((q.match(/\bthang\s+\d+/g) ?? []).length > 1)
    return reply(
      "Hãy hỏi so với tháng trước của tháng đang chọn. Tôi chưa hỗ trợ so sánh hai tháng được nêu tự do.",
      false,
    );
  const expenses = ledger.categories.expense.filter((n) => q.includes(fold(n)));
  const incomes = ledger.categories.income.filter((n) => q.includes(fold(n)));
  const matched = [...new Set([...expenses, ...incomes])];
  if (matched.length > 1)
    return reply("Bạn hãy hỏi từng danh mục để tôi tổng hợp chính xác.", false);
  const category = matched[0];
  const knownMembers = [
    ...new Set(ledger.entries.map((e) => e.member).filter(Boolean)),
  ];
  const members = knownMembers.filter((m) =>
    new RegExp(
      `(?:^|[^a-z0-9])${fold(m).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`,
    ).test(q),
  );
  const namedMember = /\b(?:thanh vien|nguoi)\s+([^?.,]+)/.exec(q);
  if (members.length > 1)
    return reply(
      "Bạn hãy hỏi từng thành viên để tôi tổng hợp chính xác.",
      false,
    );
  if (namedMember && !members.length)
    return reply(
      "Tôi chưa tìm thấy thành viên đó trong các giao dịch đã ghi. Hãy dùng đúng tên ở trường Thành viên.",
      false,
    );
  const member = members[0];
  let remainder = q;
  for (const name of [...matched, ...members])
    remainder = remainder.replaceAll(fold(name), " ");
  const vocabulary = new Set(
    "thang nay truoc nam toi nha minh gia dinh cua cho biet hay xem giup vui long o trong da ghi nhan la co bao nhieu tong thu chi tieu tien khoan nhap duoc luong nhieu nhat lon top di dau co cau ngan sach han muc con lai du tiet kiem tinh hinh so voi sanh tang giam thanh vien nguoi va thi the nao het nhi a".split(
      " ",
    ),
  );
  if (
    remainder
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .some((word) => !/^\d+$/.test(word) && !vocabulary.has(word))
  )
    return reply(
      "Tôi chưa hiểu đủ câu hỏi. Bạn hãy hỏi tổng thu chi, chi nhiều nhất, ngân sách hoặc so sánh với tháng trước; dùng đúng tên danh mục/thành viên trong sổ.",
      false,
    );

  const filtered = (m: string) =>
    monthEntries(ledger, m).filter(
      (e) =>
        (!category || e.category === category) &&
        (!member || e.member === member),
    );
  const entries = filtered(month),
    summary = totals(entries);
  const scope = `${labelMonth(month)}${category ? ` · ${category}` : ""}${member ? ` · ${member}` : ""}`;
  const kind: Kind =
    /\b(thu|thu nhap|khoan thu|tien thu|luong|thu duoc)\b/.test(q) &&
    !/\bthu chi\b/.test(q)
      ? "income"
      : "expense";
  if (comparing) {
    const previous = shiftMonth(month, -1);
    if (previous === month)
      return reply("Không có tháng trước trong phạm vi dữ liệu hỗ trợ.", false);
    const previousEntries = filtered(previous);
    if (!entries.length || !previousEntries.length)
      return reply(
        `Chưa đủ giao dịch ở cả ${scope} và ${labelMonth(previous)} để so sánh. Tháng chưa có dữ liệu không có nghĩa là thực tế không thu chi.`,
      );
    const before = totals(previousEntries)[kind],
      after = summary[kind],
      difference = after - before;
    return reply(
      `${kind === "income" ? "Thu nhập" : "Chi tiêu"} ${scope}: ${money(after)}. ${labelMonth(previous)}: ${money(before)}. ${difference === 0 ? "Không thay đổi" : `${difference > 0 ? "Tăng" : "Giảm"} ${money(Math.abs(difference))}${before > 0 ? ` (${((Math.abs(difference) / before) * 100).toFixed(1)}%)` : ""}`} theo các giao dịch đã ghi.`,
    );
  }
  if (/\b(ngan sach|han muc)\b/.test(q)) {
    if (member)
      return reply(
        "Ngân sách được đặt theo danh mục của cả sổ, chưa chia riêng theo thành viên.",
        false,
      );
    const limits = Object.entries(ledger.budgets[month] ?? {}).filter(
      ([n]) => !category || n === category,
    );
    if (!limits.length)
      return reply(
        `Chưa đặt ngân sách cho ${scope}. Bạn có thể thêm ở màn hình Ngân sách.`,
      );
    const spent = breakdown(
      monthEntries(ledger, month),
      "expense",
      ledger.categories.expense,
    );
    return reply(
      `Ngân sách ${scope}:\n` +
        limits
          .map(([name, limit]) => {
            const value = spent.find((x) => x.category === name)?.amount ?? 0;
            return `${name}: đã chi ${money(value)} / hạn mức ${money(limit)}; ${value > limit ? `vượt ${money(value - limit)}` : `còn ${money(limit - value)}`}.`;
          })
          .join("\n"),
    );
  }
  if (!entries.length)
    return reply(
      `Chưa có giao dịch đã ghi cho ${scope}. Tôi chưa có số liệu để trả lời.`,
    );
  if (/\b(nhieu nhat|lon nhat|top|di dau|co cau)\b/.test(q)) {
    const rows = breakdown(entries, kind, ledger.categories[kind])
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    if (!rows.length)
      return reply(
        `Chưa ghi nhận khoản ${kind === "income" ? "thu" : "chi"} nào cho ${scope}.`,
      );
    const total = summary[kind];
    return reply(
      `${kind === "income" ? "Nguồn thu" : "Khoản chi"} lớn nhất ${scope}: ${rows
        .slice(0, 3)
        .map(
          (x) =>
            `${x.category} ${money(x.amount)} (${((x.amount / total) * 100).toFixed(1)}%)`,
        )
        .join(
          "; ",
        )}. Tổng ${kind === "income" ? "thu" : "chi"} đã ghi: ${money(total)}.`,
    );
  }
  if (
    /\b(bao nhieu|tong|con lai|du|tiet kiem|thu chi|chi tieu|thu nhap|tinh hinh)\b/.test(
      q,
    )
  ) {
    if (/\b(tiet kiem|so du|con lai)\b/.test(q))
      return reply(
        `${scope}: thu ${money(summary.income)}, chi ${money(summary.expense)}; chênh lệch thu–chi ${money(summary.balance)}. Đây là chênh lệch từ giao dịch đã ghi, chưa gồm số dư đầu kỳ.`,
      );
    if (
      category ||
      member ||
      (/\b(chi|chi tieu|tien chi|khoan chi|thu nhap|khoan thu|tien thu|luong)\b/.test(
        q,
      ) &&
        !/\bthu chi\b/.test(q))
    )
      return reply(
        `${scope}: ${kind === "income" ? "thu" : "chi"} ${money(summary[kind])}, từ ${entries.filter((e) => e.kind === kind).length} giao dịch đã ghi.`,
      );
    return reply(
      `${scope}: thu ${money(summary.income)}, chi ${money(summary.expense)}, chênh lệch ${money(summary.balance)}. Có ${entries.length} giao dịch đã ghi; chưa gồm số dư đầu kỳ.`,
    );
  }
  return reply(
    "Tôi hiện trả lời được tổng thu chi, danh mục chi nhiều nhất, ngân sách và so sánh tháng trước. Bạn thử: “Tháng này chi bao nhiêu?” hoặc “So sánh chi tiêu với tháng trước”. Chưa kết nối AI hội thoại tự do.",
    false,
  );
}
