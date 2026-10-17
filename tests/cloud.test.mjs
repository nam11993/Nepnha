import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
test("Database permissions, family isolation, concurrent edits, validation and deletion", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(
      await fs.readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      await fs.readFile(
        new URL("../supabase/custom-categories.sql", import.meta.url),
        "utf8",
      ),
    );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002",
      c = "00000000-0000-4000-8000-000000000003";
    await db.query("insert into auth.users values($1),($2),($3)", [a, b, c]);
    async function as(id) {
      await db.exec("reset role");
      await db.query("select set_config('app.user_id',$1,false)", [id]);
      await db.exec("set role authenticated");
    }
    const rpc = async (sql, args = []) =>
      (await db.query(sql, args)).rows[0]?.result;
    await db.exec("set role anon");
    await assert.rejects(
      () => db.query("select public.get_my_household()"),
      /permission denied/,
    );
    await as(a);
    const home = await rpc(
      "select public.create_my_household('Nhà A') as result",
    );
    assert.equal(home.revision, 0);
    await assert.rejects(
      () => db.query("select * from public.households"),
      /permission denied/,
    );
    await as(b);
    assert.equal(await rpc("select public.get_my_household() as result"), null);
    await rpc("select public.join_household($1) as result", [home.invite_code]);
    const ledger = {
      version: 1,
      entries: [
        {
          id: "e1",
          kind: "income",
          category: "Lương",
          amount: 500000,
          date: "2026-10-14",
          note: "",
          member: "",
          payment: "Tiền mặt",
        },
      ],
      budgets: {},
    };
    const saved = await rpc("select public.save_my_ledger($1,$2) as result", [
      0,
      ledger,
    ]);
    assert.equal(saved.revision, 1);
    const custom = {
      ...ledger,
      categories: { income: ["Thu riêng"], expense: ["Thú cưng"] },
      entries: [{ ...ledger.entries[0], category: "Thu riêng" }],
      budgets: { "2026-10": { "Thú cưng": 0 } },
    };
    const customized = await rpc(
      "select public.save_my_ledger($1,$2) as result",
      [1, custom],
    );
    assert.equal(customized.ledger.entries[0].category, "Thu riêng");
    await assert.rejects(
      () =>
        rpc("select public.save_my_ledger($1,$2) as result", [
          2,
          {
            ...custom,
            categories: {
              income: ["Thu riêng", "thu riêng"],
              expense: ["Thú cưng"],
            },
          },
        ]),
      /duplicate_category/,
    );
    await assert.rejects(
      () =>
        rpc("select public.save_my_ledger($1,$2) as result", [
          2,
          { ...custom, budgets: { "2026-10": { "Không có": 50 } } },
        ]),
      /invalid_budget/,
    );
    await as(a);
    await assert.rejects(
      () => rpc("select public.save_my_ledger($1,$2) as result", [0, ledger]),
      /revision_conflict/,
    );
    assert.equal(
      (await rpc("select public.get_my_household() as result")).ledger
        .entries[0].amount,
      500000,
    );
    await assert.rejects(
      () =>
        rpc("select public.save_my_ledger($1,$2) as result", [
          1,
          { ...ledger, entries: [{ ...ledger.entries[0], amount: -5 }] },
        ]),
      /invalid_entry/,
    );
    await rpc("select public.rotate_invite_code() as result");
    await as(c);
    await assert.rejects(
      () =>
        rpc("select public.join_household($1) as result", [home.invite_code]),
      /invalid_invite_code/,
    );
    const other = await rpc(
      "select public.create_my_household('Nhà C') as result",
    );
    assert.notEqual(other.id, home.id);
    assert.equal(other.ledger.entries.length, 0);
    await as(b);
    await rpc("select public.delete_my_account() as result");
    await as(a);
    assert.equal(
      (await rpc("select public.get_my_household() as result")).id,
      home.id,
    );
    await rpc("select public.delete_my_account() as result");
    await db.exec("reset role");
    assert.equal(
      (await db.query("select count(*)::int as n from public.households"))
        .rows[0].n,
      1,
    );
  } finally {
    await db.close();
  }
});
