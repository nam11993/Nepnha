export type Kind = "income" | "expense";
export const categories = {
  income: [
    "Lương",
    "Thưởng",
    "Kinh doanh / làm thêm",
    "Lãi tiết kiệm / đầu tư",
    "Quà tặng / trợ cấp",
    "Thu khác",
  ],
  expense: [
    "Ăn uống",
    "Nhà ở",
    "Điện nước / Internet",
    "Đi lại",
    "Con cái / học tập",
    "Y tế",
    "Mua sắm",
    "Giải trí / du lịch",
    "Hiếu hỉ / biếu tặng",
    "Chi khác",
  ],
};
export const payments = ["Tiền mặt", "Chuyển khoản", "Thẻ", "Ví điện tử"];
export type Entry = {
  id: string;
  kind: Kind;
  amount: number;
  date: string;
  category: string;
  note: string;
  member: string;
  payment: string;
};
export type Ledger = {
  version: 1;
  categories: Record<Kind, string[]>;
  entries: Entry[];
  budgets: Record<string, Record<string, number>>;
};
export const emptyLedger = (): Ledger => ({
  version: 1,
  categories: {
    income: [...categories.income],
    expense: [...categories.expense],
  },
  entries: [],
  budgets: {},
});
export const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const currentMonth = () => localDate().slice(0, 7);
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return y >= 2000 && y <= 2100 && localDate(new Date(y, m - 1, d)) === value;
}
export function parseDate(value: string): string {
  const parts = value.trim().split("/");
  const iso =
    parts.length === 3
      ? `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
      : "";
  if (!validDate(iso))
    throw Error("Ngày không hợp lệ. Nhập theo dạng dd/mm/yyyy (2000–2100).");
  return iso;
}
export const displayDate = (iso: string) => iso.split("-").reverse().join("/");
export function parseAmount(raw: string, allowZero = false): number {
  if (!/^\d+$/.test(raw.trim()))
    throw Error("Nhập số tiền bằng chữ số, không dùng dấu chấm hoặc dấu phẩy.");
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > 1e12
  )
    throw Error(
      "Số tiền phải từ " + (allowZero ? "0" : "1") + " đến 1.000 tỷ đồng.",
    );
  return value;
}
export const monthEntries = (data: Ledger, month: string) =>
  data.entries
    .filter((e) => e.date.startsWith(month + "-"))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
export function totals(entries: Entry[]) {
  const income = entries
    .filter((e) => e.kind === "income")
    .reduce((a, e) => a + e.amount, 0);
  const expense = entries
    .filter((e) => e.kind === "expense")
    .reduce((a, e) => a + e.amount, 0);
  if (!Number.isSafeInteger(income) || !Number.isSafeInteger(expense))
    throw Error("Tổng tiền vượt giới hạn tính toán.");
  return { income, expense, balance: income - expense };
}
export function breakdown(
  entries: Entry[],
  kind: Kind,
  names = categories[kind],
) {
  return [
    ...new Set([
      ...names,
      ...entries.filter((e) => e.kind === kind).map((e) => e.category),
    ]),
  ].map((category) => ({
    category,
    amount: entries
      .filter((e) => e.kind === kind && e.category === category)
      .reduce((a, e) => a + e.amount, 0),
  }));
}
export function annual(data: Ledger, year: string) {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    ...totals(monthEntries(data, `${year}-${String(i + 1).padStart(2, "0")}`)),
  }));
}
export function shiftMonth(month: string, step: number) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1 + step, 1);
  return date.getFullYear() < 2000 || date.getFullYear() > 2100
    ? month
    : localDate(date).slice(0, 7);
}
export function calendarDays(month: string): (string | null)[] {
  const [year, m] = month.split("-").map(Number);
  const first = (new Date(year, m - 1, 1).getDay() + 6) % 7;
  const count = new Date(year, m, 0).getDate();
  return Array.from({ length: 42 }, (_, i) =>
    i >= first && i < first + count
      ? `${month}-${String(i - first + 1).padStart(2, "0")}`
      : null,
  );
}
export function chartFocusMonth(
  rows: ReturnType<typeof annual>,
  selected: string,
  today = currentMonth(),
) {
  const active = rows
    .filter((r) => r.income > 0 || r.expense > 0)
    .map((r) => r.month);
  const chosen = Number(selected.slice(5));
  const current = Number(today.slice(5));
  if (selected.slice(0, 4) === today.slice(0, 4) && active.includes(current))
    return current;
  if (!active.length || active.includes(chosen)) return chosen;
  return active.sort(
    (a, b) => Math.abs(a - chosen) - Math.abs(b - chosen) || b - a,
  )[0];
}
export function updateCategory(
  data: Ledger,
  kind: Kind,
  previous: string | null,
  raw: string,
): Ledger {
  const name = raw.trim();
  const list = data.categories[kind];
  if (
    !name ||
    name.length > 60 ||
    ["__proto__", "constructor", "prototype"].includes(name.toLowerCase())
  )
    throw Error("Tên danh mục cần từ 1 đến 60 ký tự.");
  if (
    list.some(
      (c) =>
        c !== previous &&
        c.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
    )
  )
    throw Error("Danh mục này đã có. Hãy chọn tên khác.");
  if (previous !== null && !list.includes(previous))
    throw Error("Danh mục đã thay đổi. Hãy mở lại và thử lại.");
  if (previous === null && list.length >= 100)
    throw Error("Mỗi loại thu / chi hỗ trợ tối đa 100 danh mục.");
  return validateLedger({
    ...data,
    categories: {
      ...data.categories,
      [kind]:
        previous === null
          ? [...list, name]
          : list.map((c) => (c === previous ? name : c)),
    },
    entries: data.entries.map((e) =>
      e.kind === kind && e.category === previous ? { ...e, category: name } : e,
    ),
    budgets:
      kind === "expense" && previous !== null
        ? Object.fromEntries(
            Object.entries(data.budgets).map(([month, values]) => [
              month,
              Object.fromEntries(
                Object.entries(values).map(([c, amount]) => [
                  c === previous ? name : c,
                  amount,
                ]),
              ),
            ]),
          )
        : data.budgets,
  });
}
export function validateLedger(input: unknown): Ledger {
  const fail = () => {
    throw Error("Tệp sao lưu không hợp lệ hoặc thuộc phiên bản chưa hỗ trợ.");
  };
  if (!input || typeof input !== "object") return fail();
  const value = input as Ledger;
  const names =
    value.categories === undefined
      ? { income: [...categories.income], expense: [...categories.expense] }
      : value.categories;
  if (!names || typeof names !== "object" || Array.isArray(names))
    return fail();
  for (const kind of ["income", "expense"] as const) {
    const list = names[kind];
    if (
      !Array.isArray(list) ||
      list.length < 1 ||
      list.length > 100 ||
      list.some(
        (c) =>
          typeof c !== "string" ||
          !c.trim() ||
          c !== c.trim() ||
          c.length > 60 ||
          ["__proto__", "constructor", "prototype"].includes(c.toLowerCase()),
      ) ||
      new Set(list.map((c) => c.toLocaleLowerCase("vi"))).size !== list.length
    )
      return fail();
  }
  if (
    value.version !== 1 ||
    !Array.isArray(value.entries) ||
    value.entries.length > 100000 ||
    !value.budgets ||
    typeof value.budgets !== "object" ||
    Array.isArray(value.budgets)
  )
    return fail();
  const ids = new Set<string>();
  for (const e of value.entries) {
    if (
      !e ||
      typeof e.id !== "string" ||
      !e.id ||
      ids.has(e.id) ||
      !["income", "expense"].includes(e.kind) ||
      !Number.isSafeInteger(e.amount) ||
      e.amount <= 0 ||
      e.amount > 1e12 ||
      typeof e.date !== "string" ||
      !validDate(e.date) ||
      !names[e.kind].includes(e.category) ||
      ![e.note, e.member, e.payment].every(
        (v) => typeof v === "string" && v.length <= 1000,
      ) ||
      !payments.includes(e.payment)
    )
      return fail();
    ids.add(e.id);
  }
  for (const [month, items] of Object.entries(value.budgets)) {
    if (
      !validDate(month + "-01") ||
      !items ||
      typeof items !== "object" ||
      Array.isArray(items)
    )
      return fail();
    for (const [category, amount] of Object.entries(items))
      if (
        !names.expense.includes(category) ||
        !Number.isSafeInteger(amount) ||
        amount < 0 ||
        amount > 1e12
      )
        return fail();
  }
  totals(value.entries);
  return { ...value, categories: names };
}
