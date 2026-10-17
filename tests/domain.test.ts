import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  annual,
  calendarDays,
  chartFocusMonth,
  breakdown,
  emptyLedger,
  monthEntries,
  parseAmount,
  parseDate,
  shiftMonth,
  totals,
  validateLedger,
  updateCategory,
} from "../src/domain.ts";
const make = (
  id: string,
  date: string,
  amount: number,
  kind: "income" | "expense" = "income",
) => ({
  id,
  date,
  amount,
  kind,
  category: kind === "income" ? "Lương" : "Ăn uống",
  note: "",
  member: "",
  payment: "Tiền mặt",
});
test("Custom categories migrate old backups and rename transactions and all budgets without changing amounts", () => {
  const legacy = {
    version: 1,
    entries: [make("x", "2026-10-01", 200, "expense")],
    budgets: { "2026-10": { "Ăn uống": 0 }, "2026-11": { "Ăn uống": 1000 } },
  };
  const migrated = validateLedger(legacy);
  const added = updateCategory(migrated, "expense", null, "Thú cưng");
  const renamed = updateCategory(added, "expense", "Ăn uống", "Đi chợ");
  assert.equal(renamed.entries[0].category, "Đi chợ");
  assert.equal(renamed.entries[0].amount, 200);
  assert.equal(renamed.budgets["2026-10"]["Đi chợ"], 0);
  assert.equal(renamed.budgets["2026-11"]["Đi chợ"], 1000);
  assert.equal(renamed.budgets["2026-10"]["Ăn uống"], undefined);
  assert.equal(
    breakdown(renamed.entries, "expense").find((r) => r.category === "Đi chợ")
      ?.amount,
    200,
  );
  assert.throws(() => updateCategory(added, "expense", null, "thú cưng"));
  assert.throws(() => updateCategory(added, "expense", null, "__proto__"));
  assert.deepEqual(
    validateLedger(JSON.parse(JSON.stringify(renamed))),
    renamed,
  );
});
test("Calendar uses Monday first, includes leap day and never spills into adjacent months", () => {
  const days = calendarDays("2024-02");
  assert.equal(days.length, 42);
  assert.equal(days[0], null);
  assert.equal(days[3], "2024-02-01");
  assert.equal(days.filter(Boolean).length, 29);
  assert.ok(days.includes("2024-02-29"));
  assert.equal(calendarDays("2025-02").filter(Boolean).length, 28);
});
test("Chart focuses current month with data, otherwise selected or nearest month with data", () => {
  const data = {
    ...emptyLedger(),
    entries: [make("a", "2026-03-01", 50), make("b", "2026-10-01", 100)],
  };
  const rows = annual(data, "2026");
  assert.equal(chartFocusMonth(rows, "2026-01", "2026-10"), 10);
  assert.equal(chartFocusMonth(rows, "2026-03", "2026-11"), 3);
  assert.equal(chartFocusMonth(rows, "2026-09", "2026-11"), 10);
  assert.equal(
    chartFocusMonth(annual(emptyLedger(), "2026"), "2026-09", "2026-11"),
    9,
  );
});
test("Months, year boundaries, income breakdown and balance", () => {
  const data = {
    ...emptyLedger(),
    entries: [
      make("a", "2026-10-01", 1000),
      make("b", "2026-10-31", 200, "expense"),
      make("c", "2026-11-01", 300, "expense"),
      make("d", "2027-01-01", 500),
    ],
  };
  assert.deepEqual(totals(monthEntries(data, "2026-10")), {
    income: 1000,
    expense: 200,
    balance: 800,
  });
  assert.equal(annual(data, "2026")[10].expense, 300);
  assert.equal(annual(data, "2027")[0].income, 500);
  assert.equal(
    breakdown(monthEntries(data, "2026-10"), "income")[0].amount,
    1000,
  );
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});
test("Leap year validation rejects impossible dates", () => {
  assert.equal(parseDate("29/02/2024"), "2024-02-29");
  assert.throws(() => parseDate("29/02/2025"));
  assert.throws(() => parseDate("31/04/2026"));
});
test("VND uses exact positive integers; zero allowed only for budgets", () => {
  assert.equal(parseAmount("150000"), 150000);
  assert.equal(parseAmount("0", true), 0);
  for (const n of ["0", "-1", "10.5", "1,000", "abc", "1000000000001"])
    assert.throws(() => parseAmount(n));
});
test("Backup validates duplicate ids, categories and version before restoring", () => {
  const data = { ...emptyLedger(), entries: [make("a", "2026-10-01", 1000)] };
  assert.deepEqual(validateLedger(JSON.parse(JSON.stringify(data))), data);
  assert.throws(() =>
    validateLedger({ ...data, entries: [...data.entries, ...data.entries] }),
  );
  assert.throws(() => validateLedger({ ...data, version: 2 }));
  assert.throws(() =>
    validateLedger({
      ...data,
      entries: [{ ...data.entries[0], category: "Nhà ở" }],
    }),
  );
  assert.throws(() =>
    validateLedger({ ...data, budgets: { "2026-13": { "Ăn uống": 5 } } }),
  );
});
test("Budgets preserve blank versus zero and independent months", () => {
  const data = {
    ...emptyLedger(),
    budgets: { "2026-10": { "Ăn uống": 0 }, "2026-11": { "Ăn uống": 5000000 } },
  };
  const checked = validateLedger(data);
  assert.equal(checked.budgets["2026-10"]["Ăn uống"], 0);
  assert.equal(checked.budgets["2026-11"]["Ăn uống"], 5000000);
  assert.equal(checked.budgets["2026-10"]["Nhà ở"], undefined);
});
