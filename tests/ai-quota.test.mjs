import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
test("AI quotas are private, limited to enabled families and shared atomically across members", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$; grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(
      await fs.readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      await fs.readFile(
        new URL("../supabase/ai-access.sql", import.meta.url),
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
    await as(a);
    const home = (
      await db.query("select public.create_my_household('A') as result")
    ).rows[0].result;
    await as(b);
    await db.query("select public.join_household($1)", [home.invite_code]);
    await as(c);
    await db.query("select public.create_my_household('C')");
    await db.exec("reset role");
    await db.query(
      "insert into nepnha_ai.access(household_id,daily_limit) values($1,2)",
      [home.id],
    );
    await db.exec("set role anon");
    await assert.rejects(
      () => db.query("select public.get_my_ai_access()"),
      /permission denied/,
    );
    await as(c);
    assert.equal(
      (await db.query("select public.get_my_ai_access() as r")).rows[0].r
        .enabled,
      false,
    );
    assert.equal(
      (await db.query("select public.consume_my_ai_request() as r")).rows[0].r
        .enabled,
      false,
    );
    await as(a);
    await assert.rejects(
      () => db.query("select * from nepnha_ai.access"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("select nepnha_ai.my_access(false)"),
      /permission denied/,
    );
    assert.equal(
      (await db.query("select public.consume_my_ai_request() as r")).rows[0].r
        .used,
      1,
    );
    await as(b);
    await assert.rejects(
      () => db.query("select public.consume_my_ai_request()"),
      /ai_rate_limit/,
    );
    await db.exec(
      "reset role;update nepnha_ai.usage set last_request_at=now()-interval '3 seconds'",
    );
    await as(b);
    assert.equal(
      (await db.query("select public.consume_my_ai_request() as r")).rows[0].r
        .used,
      2,
    );
    await db.exec(
      "reset role;update nepnha_ai.usage set last_request_at=now()-interval '3 seconds'",
    );
    await as(a);
    await assert.rejects(
      () => db.query("select public.consume_my_ai_request()"),
      /ai_rate_limit/,
    );
    assert.equal(
      (await db.query("select public.get_my_ai_access() as r")).rows[0].r.used,
      2,
    );
  } finally {
    await db.close();
  }
});

test("every authenticated user gets independent usage, including users without a family", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;",
    );
    for (const file of ["schema.sql", "ai-access.sql", "ai-user-access.sql"])
      await db.exec(
        await fs.readFile(
          new URL("../supabase/" + file, import.meta.url),
          "utf8",
        ),
      );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users values($1),($2)", [a, b]);
    await db.query(
      "insert into nepnha_ai.user_limits(user_id,daily_limit) values($1,1)",
      [a],
    );
    const as = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('app.user_id',$1,false)", [id]);
      await db.exec("set role authenticated");
    };
    await db.exec("set role anon");
    await assert.rejects(
      () => db.query("select public.get_my_ai_access()"),
      /permission denied/,
    );
    await as(a);
    assert.equal(
      (await db.query("select public.consume_my_ai_request() as r")).rows[0].r
        .used,
      1,
    );
    await assert.rejects(
      () => db.query("select public.consume_my_ai_request()"),
      /ai_rate_limit/,
    );
    await assert.rejects(
      () => db.query("update nepnha_ai.user_limits set daily_limit=10000"),
      /permission denied/,
    );
    await as(b);
    let access = (await db.query("select public.get_my_ai_access() as r"))
      .rows[0].r;
    assert.deepEqual(
      [access.enabled, access.used, access.limit],
      [true, 0, 20],
    );
    assert.equal(
      (await db.query("select public.consume_my_ai_request() as r")).rows[0].r
        .used,
      1,
    );
    await assert.rejects(
      () => db.query("select * from nepnha_ai.user_usage"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("select nepnha_ai.my_access(true)"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query(
      "insert into nepnha_ai.user_limits(user_id,enabled) values($1,false)",
      [b],
    );
    await as(b);
    assert.equal(
      (await db.query("select public.consume_my_ai_request() as r")).rows[0].r
        .enabled,
      false,
    );
    await as("");
    await assert.rejects(
      () => db.query("select public.get_my_ai_access()"),
      /authentication_required/,
    );
  } finally {
    await db.close();
  }
});
