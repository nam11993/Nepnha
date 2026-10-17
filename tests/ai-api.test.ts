import { test } from "node:test";
import assert from "node:assert/strict";
import { createAIHandler } from "../supabase/functions/nep-nha-ai/handler.ts";
import {
  answerAIPlan,
  validateAIDraft,
  validateAIBatch,
  type BatchVoiceDraft,
} from "../src/ai-contract.ts";
import { reviewRows, appendVoiceBatch } from "../src/voice-batch-domain.ts";
import { emptyLedger } from "../src/domain.ts";
const ledger = emptyLedger();
ledger.entries = [
  {
    id: "e",
    kind: "expense",
    amount: 250000,
    date: "2026-10-17",
    category: "Ăn uống",
    note: "Private note must not reach model",
    member: "Mẹ",
    payment: "Tiền mặt",
  },
];
const plan = {
  intent: "summary",
  from: "2026-10-01",
  to: "2026-10-31",
  compareFrom: null,
  compareTo: null,
  kind: "expense",
  category: null,
  member: null,
  clarification: "",
};
function setup(
  options: {
    key?: boolean;
    auth?: boolean;
    allowed?: boolean;
    quota?: boolean;
    upstreamStatus?: number;
    output?: unknown;
    completed?: boolean;
    noFamily?: boolean;
  } = {},
) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mock = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/auth/v1/user"))
      return Response.json(options.auth === false ? {} : { id: "user" }, {
        status: options.auth === false ? 401 : 200,
      });
    if (String(url).endsWith("/get_my_ai_access"))
      return Response.json({
        enabled: options.allowed !== false,
        used: 0,
        limit: 20,
      });
    if (String(url).endsWith("/get_my_household"))
      return Response.json(
        options.noFamily ? null : { id: "family", revision: 4, ledger },
      );
    if (String(url).endsWith("/consume_my_ai_request"))
      return Response.json(
        { enabled: true, used: 1, limit: 20 },
        { status: options.quota === false ? 400 : 200 },
      );
    if (String(url) === "https://api.openai.com/v1/responses")
      return Response.json(
        {
          status: options.completed === false ? "incomplete" : "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(options.output ?? plan),
                },
              ],
            },
          ],
        },
        { status: options.upstreamStatus ?? 200 },
      );
    throw Error("Unexpected request: " + url);
  }) as typeof fetch;
  const handler = createAIHandler(
    {
      get: (name) =>
        name === "SUPABASE_URL"
          ? "https://supabase.invalid"
          : name === "OPENAI_API_KEY" && options.key !== false
            ? "sk-only-a-unit-test-placeholder"
            : undefined,
    },
    mock,
  );
  return { calls, handler };
}
function req(
  body: unknown = {
    mode: "ask",
    text: "Ăn uống hết bao nhiêu tháng này?",
    month: "2026-10",
  },
  auth = true,
  origin = "https://nep-nha-thu-chi.lunargem512.chatgpt.site",
) {
  return new Request("https://example.test/nep-nha-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: "Bearer test-token" } : {}),
      origin,
    },
    body: JSON.stringify(body),
  });
}
test("AI endpoint authenticates, limits access and never calls OpenAI without configured credentials", async () => {
  for (const [options, request, status] of [
    [{}, req({}, false), 401],
    [{ auth: false }, req(), 401],
    [{ allowed: false }, req(), 403],
    [{ key: false }, req(), 503],
    [{ quota: false }, req(), 429],
    [{}, req({}, true, "https://other.example"), 403],
    [{}, req({ mode: "ask", text: "x", month: "2026-10", ledger }), 400],
  ] as const) {
    const { handler, calls } = setup(options);
    assert.equal((await handler(request)).status, status);
    assert.equal(
      calls.some((c) => c.url.includes("api.openai.com")),
      false,
    );
  }
  const { handler, calls } = setup({ key: false });
  const status = await handler(req({ mode: "status" }));
  assert.equal(status.status, 200);
  assert.equal((await status.json()).configured, false);
  assert.equal(calls.length, 2);
});
test("AI query sends only metadata, validates output and computes exact money from authenticated server ledger", async () => {
  const { handler, calls } = setup();
  const response = await handler(req());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.answer.text, /250\.000/);
  assert.equal(result.revision, 4);
  assert.equal(result.householdId, "family");
  assert.equal(result.engine, "openai");
  const openai = calls.find((c) => c.url.includes("api.openai.com"))!;
  const sent = JSON.parse(String(openai.init!.body));
  assert.equal(sent.store, false);
  assert.equal(sent.text.format.strict, true);
  assert.equal(sent.model, "gpt-6-luna");
  assert.ok(!String(openai.init!.body).includes("Private note"));
  assert.ok(!String(openai.init!.body).includes("250000"));
  assert.ok(!JSON.stringify(result).includes("sk-only"));
  assert.ok(calls.every((c) => !c.url.includes("save_my_ledger")));
});
test("AI endpoint handles billing, incomplete and invalid model responses without pretending success", async () => {
  const { handler } = setup({ upstreamStatus: 429 });
  const billing = await handler(req());
  assert.equal(billing.status, 503);
  assert.equal((await billing.json()).code, "openai_billing");
  assert.equal((await setup({ completed: false }).handler(req())).status, 502);
  assert.equal(
    (await setup({ output: { ...plan, category: "Unknown" } }).handler(req()))
      .status,
    502,
  );
  assert.equal(
    (await setup({ output: { ...plan, from: "2026-02-31" } }).handler(req()))
      .status,
    502,
  );
});
test("AI extraction sanitizes invalid money, categories and dates; query filters dates and members exactly", () => {
  const draft = validateAIDraft(
    {
      kind: "expense",
      amount: -10,
      date: "2026-02-31",
      category: "Unknown",
      payment: "Bitcoin",
      member: "Mẹ",
      note: "note",
      clarification: "",
    },
    ledger,
  );
  assert.equal(draft.amount, undefined);
  assert.equal(draft.date, undefined);
  assert.equal(draft.category, undefined);
  assert.equal(draft.payment, undefined);
  assert.ok(draft.warnings.length >= 3);
  assert.match(
    answerAIPlan(
      { ...plan, from: "2026-10-16", to: "2026-10-18", member: "Mẹ" },
      ledger,
    ).text,
    /250\.000/,
  );
  assert.throws(() =>
    answerAIPlan({ ...plan, member: "Not a member" }, ledger),
  );
  assert.match(
    answerAIPlan({ ...plan, from: "2026-09-01", to: "2026-09-30" }, ledger)
      .text,
    /Chưa có/,
  );
});

test("signed-in users can extract without a household; asking still requires their own ledger", async () => {
  const output = {
    kind: "expense",
    amount: 250000,
    date: "2026-10-18",
    category: "Ăn uống",
    payment: "Chuyển khoản",
    member: "Mẹ",
    note: "Đi chợ",
    clarification: "",
  };
  const { handler, calls } = setup({ noFamily: true, output });
  const response = await handler(
    req({
      mode: "extract",
      text: "Hôm nay đi chợ 250 nghìn, chuyển khoản, mẹ chi",
      month: "2026-10",
    }),
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.draft.amount, 250000);
  assert.equal(result.draft.member, "Mẹ");
  assert.equal(result.draft.payment, "Chuyển khoản");
  assert.equal(result.householdId, "");
  assert.equal(calls.filter((c) => c.url.includes("api.openai.com")).length, 1);
  assert.equal((await handler(req())).status, 403);
});

const multiText = "đi mua nước ở circle k 50k, đi cho ông bà 400k";
const batchOutput = {
  transactions: [
    {
      kind: "expense",
      amount: 50000,
      amountText: "50k",
      source: "đi mua nước ở circle k 50k",
      date: null,
      category: "Ăn uống",
      payment: null,
      member: null,
      note: "Mua nước ở Circle K",
      clarification: "",
    },
    {
      kind: "expense",
      amount: 400000,
      amountText: "400k",
      source: "đi cho ông bà 400k",
      date: null,
      category: "Hiếu hỉ / biếu tặng",
      payment: null,
      member: null,
      note: "Cho ông bà",
      clarification: "",
    },
  ],
  clarification: "",
};

test("batch API returns separate amounts/categories, one quota use and never saves automatically", async () => {
  const { handler, calls } = setup({ output: batchOutput });
  const response = await handler(
    req({ mode: "extract_batch", text: multiText, month: "2026-10" }),
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(
    result.drafts.map((d: BatchVoiceDraft) => [d.amount, d.category, d.member]),
    [
      [50000, "Ăn uống", undefined],
      [400000, "Hiếu hỉ / biếu tặng", undefined],
    ],
  );
  assert.equal(
    calls.filter((c) => c.url.includes("consume_my_ai_request")).length,
    1,
  );
  assert.equal(calls.filter((c) => c.url.includes("api.openai.com")).length, 1);
  assert.equal(
    calls.some((c) => c.url.includes("save_my_ledger")),
    false,
  );
  const sent = JSON.parse(
    String(calls.find((c) => c.url.includes("api.openai.com"))!.init!.body),
  );
  assert.equal(sent.text.format.schema.properties.transactions.maxItems, 8);
  assert.match(sent.instructions, /Circle K/);
  assert.match(sent.instructions, /người nhận/);
});

test("batch rejects invented/repeated source and removes money that disagrees with the spoken amount", () => {
  const bad = structuredClone(batchOutput);
  bad.transactions[0].amount = 450000;
  assert.equal(
    validateAIBatch(bad, ledger, multiText).drafts[0].amount,
    undefined,
  );
  const wrongUnit = structuredClone(batchOutput);
  wrongUnit.transactions[0].amountText = "500k";
  assert.equal(
    validateAIBatch(wrongUnit, ledger, multiText).drafts[0].amount,
    undefined,
  );
  const fake = structuredClone(batchOutput);
  fake.transactions[0].source = "mua xe 50k";
  assert.throws(
    () => validateAIBatch(fake, ledger, multiText),
    /invalid_ai_source/,
  );
  assert.throws(
    () =>
      validateAIBatch(
        {
          transactions: [
            batchOutput.transactions[0],
            batchOutput.transactions[0],
          ],
        },
        ledger,
        multiText,
      ),
    /invalid_ai_source/,
  );
  assert.throws(
    () =>
      validateAIBatch(
        { transactions: Array(9).fill(batchOutput.transactions[0]) },
        ledger,
        multiText,
      ),
    /invalid_ai_batch/,
  );
});

test("batch review creates two independent entries atomically; edits/removal work and invalid rows never alter original ledger", () => {
  const drafts = validateAIBatch(batchOutput, ledger, multiText).drafts;
  const rows = reviewRows(drafts, "2026-10-18");
  const original = JSON.stringify(ledger);
  let id = 0;
  const next = appendVoiceBatch(ledger, rows, () => "batch-" + ++id);
  assert.equal(next.entries.length, ledger.entries.length + 2);
  assert.deepEqual(
    next.entries.slice(-2).map((e) => [e.amount, e.date, e.member]),
    [
      [50000, "2026-10-18", ""],
      [400000, "2026-10-18", ""],
    ],
  );
  assert.equal(JSON.stringify(ledger), original);
  assert.throws(
    () =>
      appendVoiceBatch(
        ledger,
        [rows[0], { ...rows[1], amount: "" }],
        () => "x",
      ),
    /Khoản 2/,
  );
  assert.equal(JSON.stringify(ledger), original);
  const edited = appendVoiceBatch(
    ledger,
    [{ ...rows[1], amount: "350000", payment: "Chuyển khoản" }],
    () => "edited",
  );
  assert.equal(edited.entries.at(-1)!.amount, 350000);
  assert.equal(edited.entries.at(-1)!.payment, "Chuyển khoản");
  assert.equal(edited.entries.length, ledger.entries.length + 1);
});

test("mixed income/expense, shared metadata and compound units remain distinct", () => {
  const text = "nhận lương 15 triệu, mua tủ 2 triệu 350 nghìn";
  const value = {
    transactions: [
      {
        ...batchOutput.transactions[0],
        kind: "income",
        category: "Lương",
        source: "nhận lương 15 triệu",
        amount: 15000000,
        amountText: "15 triệu",
        date: "2026-10-18",
        member: "Mẹ",
        payment: "Chuyển khoản",
      },
      {
        ...batchOutput.transactions[0],
        category: "Mua sắm",
        source: "mua tủ 2 triệu 350 nghìn",
        amount: 2350000,
        amountText: "2 triệu 350 nghìn",
        date: "2026-10-18",
        member: "Mẹ",
        payment: "Chuyển khoản",
      },
    ],
  };
  const result = validateAIBatch(value, ledger, text);
  assert.deepEqual(
    result.drafts.map((d) => [d.kind, d.amount]),
    [
      ["income", 15000000],
      ["expense", 2350000],
    ],
  );
  const ambiguous = structuredClone(value);
  ambiguous.transactions[1].amountText = "35";
  ambiguous.transactions[1].source = "mua tủ 35";
  assert.equal(
    validateAIBatch(ambiguous, ledger, "nhận lương 15 triệu, mua tủ 35")
      .drafts[1].amount,
    undefined,
  );
});
