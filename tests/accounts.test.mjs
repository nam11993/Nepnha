import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
test("account upgrade resets legacy entries; personal sync, author permissions, audit and family lifecycle", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(user_id uuid);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    for (const name of ["schema.sql", "custom-categories.sql"])
      await db.exec(
        await fs.readFile(
          new URL("../supabase/" + name, import.meta.url),
          "utf8",
        ),
      );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002",
      c = "00000000-0000-4000-8000-000000000003";
    await db.query("insert into auth.users values($1),($2),($3)", [a, b, c]);
    const as = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('app.user_id',$1,false)", [id]);
      await db.exec("set role authenticated");
    };
    const rpc = async (name, args = [], casts = []) =>
      (
        await db.query(
          `select public.${name}(${args.map((_, i) => "$" + (i + 1) + (casts[i] ? "::" + casts[i] : "")).join(",")}) as result`,
          args,
        )
      ).rows[0]?.result;
    const entry = (id, member = "Ghi hộ") => ({
      id,
      kind: "expense",
      category: "Ăn uống",
      amount: 50000,
      date: "2026-10-18",
      member,
      note: "đi chợ",
      payment: "Tiền mặt",
    });
    await as(a);
    const legacy = await rpc("create_my_household", ["Nhà cũ"]);
    await rpc("save_my_ledger", [
      0,
      { version: 1, entries: [entry("legacy")], budgets: {} },
    ]);
    await db.exec("reset role");
    await db.exec(
      await fs.readFile(
        new URL("../supabase/accounts-and-families.sql", import.meta.url),
        "utf8",
      ),
    );
    await as(a);
    let account = await rpc("get_my_account");
    assert.equal(account.book.id, legacy.id);
    assert.equal(account.book.owner_id, a);
    assert.equal(account.book.is_family, true);
    assert.equal(account.book.ledger.entries.length, 0);
    await assert.rejects(
      () =>
        rpc("save_my_ledger", [
          account.book.revision,
          account.book.ledger,
          account.book.id,
          "accounts-v2",
        ]),
      /name_required/,
    );
    await rpc("set_my_name", ["Nam"]);
    const save = async (book, entries, patch = {}) =>
      rpc("save_my_ledger", [
        book.revision,
        { ...book.ledger, ...patch, entries },
        book.id,
        "accounts-v2",
      ]);
    let home = account.book;
    home = await save(home, [{ ...entry("owner"), created_by: b }]);
    assert.equal(home.ledger.entries[0].created_by, a);
    await assert.rejects(
      () =>
        rpc("save_my_ledger", [
          home.revision - 1,
          home.ledger,
          home.id,
          "accounts-v2",
        ]),
      /revision_conflict/,
    );
    await assert.rejects(
      () => rpc("save_my_ledger", [home.revision, home.ledger, home.id, "old"]),
      /upgrade_required/,
    );
    await rpc("set_my_ai_consent", [true]);
    assert.equal((await rpc("get_my_account")).profile.ai_consent, true);
    await rpc("set_my_ai_consent", [false]);
    assert.equal((await rpc("get_my_account")).profile.ai_consent, false);
    await as(b);
    const personal = await rpc("get_my_account");
    await rpc("set_my_name", ["Mẹ"]);
    assert.equal(personal.book.is_family, false);
    const privateBook = await save(personal.book, [entry("private")]);
    home = await rpc("join_household", [legacy.invite_code]);
    await assert.rejects(
      () => save(home, [{ ...home.ledger.entries[0], amount: 90000 }]),
      /entry_permission_denied/,
    );
    await assert.rejects(() => save(home, []), /entry_permission_denied/);
    await assert.rejects(
      () =>
        save(home, home.ledger.entries, {
          budgets: { "2026-10": { "Ăn uống": 1000 } },
        }),
      /owner_required/,
    );
    home = await save(home, [...home.ledger.entries, entry("member", "Bố")]);
    assert.equal(home.ledger.entries[1].created_by, b);
    const events = await rpc("get_my_audit");
    assert.equal(events[0].actor_id, b);
    assert.equal(events[0].actor_name, "Mẹ");
    assert.equal(events[0].after_value.member, "Bố");
    home = await save(
      home,
      home.ledger.entries.map((e) =>
        e.id === "member" ? { ...e, amount: 123000 } : e,
      ),
    );
    const audit = await rpc("get_my_audit");
    assert.equal(audit[0].action, "update");
    assert.equal(audit[0].before_value.amount, 50000);
    assert.equal(audit[0].after_value.amount, 123000);
    await rpc("set_my_name", ["Mẹ mới"]);
    home = await rpc("get_my_household");
    assert.equal(home.ledger.entries[1].member, "Bố");
    await assert.rejects(
      () => rpc("remove_family_member", [a, true]),
      /owner_required/,
    );
    await rpc("leave_my_family");
    let own = await rpc("get_my_account");
    assert.equal(own.book.id, privateBook.id);
    assert.equal(own.book.ledger.entries[0].id, "private");
    await assert.rejects(() => save(home, home.ledger.entries), /book_changed/);
    await rpc("join_household", [legacy.invite_code]);
    await as(a);
    home = await rpc("get_my_household");
    await rpc("remove_family_member", [b, true]);
    const rotated = await rpc("get_my_household");
    assert.notEqual(rotated.invite_code, legacy.invite_code);
    await as(b);
    await assert.rejects(
      () => rpc("join_household", [legacy.invite_code]),
      /invalid_invite_code/,
    );
    await rpc("join_household", [rotated.invite_code]);
    await as(c);
    await rpc("get_my_account");
    await rpc("set_my_name", ["Khác"]);
    assert.deepEqual(await rpc("get_my_audit"), []);
    await assert.rejects(
      () => rpc("remove_family_member", [b, true]),
      /owner_required/,
    );
    await db.exec("select 1");
    await assert.rejects(
      () => db.query("select * from public.ledger_audit"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("select * from public.entry_authors"),
      /permission denied/,
    );
    await as(a);
    await assert.rejects(
      () => rpc("delete_my_account"),
      /disband_before_account_deletion/,
    );
    home = await rpc("get_my_household");
    home = await save(
      home,
      home.ledger.entries.map((e) =>
        e.id === "member" ? { ...e, amount: 200000 } : e,
      ),
    );
    home = await save(
      home,
      home.ledger.entries.filter((e) => e.id !== "owner"),
    );
    const finalAudit = await rpc("get_my_audit");
    assert.equal(finalAudit[0].action, "delete");
    assert.equal(finalAudit[0].actor_id, a);
    await rpc("disband_my_family");
    own = await rpc("get_my_account");
    assert.equal(own.book.is_family, false);
    assert.equal(own.book.ledger.entries[0].amount, 200000);
    await as(b);
    own = await rpc("get_my_account");
    assert.equal(own.book.id, privateBook.id);
    await as(a);
    const again = await rpc("create_my_household", ["Nhà mới"]);
    assert.notEqual(again.invite_code, rotated.invite_code);
    await as(b);
    await rpc("join_household", [again.invite_code]);
    await rpc("delete_my_account");
    await as(a);
    home = await rpc("get_my_household");
    assert.equal(home.ledger.entries[0].created_by, null);
    const deletedAudit = await rpc("get_my_audit");
    assert.ok(
      deletedAudit
        .filter((e) => e.actor_id === null)
        .every((e) => e.actor_name === "Tài khoản đã xóa"),
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(() => rpc("get_my_account"), /permission denied/);
  } finally {
    await db.close();
  }
});
