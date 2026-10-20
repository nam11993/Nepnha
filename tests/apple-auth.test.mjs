import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { createHash, randomUUID } from "node:crypto";
import ts from "typescript";

// Execute the actual auth implementation with platform/provider SDK doubles.
// No Apple/Supabase login, token, secret or paid service is used by this test.
test("Apple authentication uses verified native nonce, preserves linking, and handles cancel/failure", async () => {
  const source = await fs.readFile(
    new URL("../src/apple-sign-in.tsx", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  const platform = { OS: "ios" };
  const calls = [];
  let appleError = null,
    serverError = null,
    token = "mock-apple-token",
    available = true;
  const auth = Object.fromEntries(
    ["signInWithIdToken", "signInWithOAuth", "linkIdentity"].map((name) => [
      name,
      async (value) => {
        calls.push({ name, value });
        return { error: serverError };
      },
    ]),
  );
  const mocks = {
    react: {},
    "react-native": { Platform: platform },
    "./cloud": { cloud: { auth } },
    "expo-crypto": {
      randomUUID,
      CryptoDigestAlgorithm: { SHA256: "SHA256" },
      digestStringAsync: async (_, value) =>
        createHash("sha256").update(value).digest("hex"),
    },
    "expo-apple-authentication": {
      AppleAuthenticationScope: { EMAIL: 1 },
      isAvailableAsync: async () => available,
      signInAsync: async (value) => {
        calls.push({ name: "native", value });
        if (appleError) throw appleError;
        return { identityToken: token };
      },
    },
  };
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    require: (name) => {
      assert.ok(name in mocks, `Unexpected dependency: ${name}`);
      return mocks[name];
    },
  });
  const signIn = exports.signInWithApple;
  await signIn();
  assert.equal(calls[0].name, "native");
  assert.equal(calls[1].name, "signInWithIdToken");
  assert.equal(calls[1].value.token, token);
  assert.equal(
    calls[0].value.nonce,
    createHash("sha256").update(calls[1].value.nonce).digest("hex"),
  );
  const firstNonce = calls[1].value.nonce;
  calls.length = 0;
  await signIn(true);
  assert.equal(calls[1].name, "linkIdentity");
  assert.notEqual(calls[1].value.nonce, firstNonce);
  calls.length = 0;
  serverError = Error("identity_already_exists");
  await assert.rejects(() => signIn(true), /identity_already_exists/);
  assert.deepEqual(
    calls.map((c) => c.name),
    ["native", "linkIdentity"],
  );
  serverError = null;
  calls.length = 0;
  appleError = { code: "ERR_REQUEST_CANCELED" };
  await signIn();
  assert.equal(calls.length, 1);
  appleError = null;
  token = null;
  await assert.rejects(() => signIn(), /Apple chưa trả về/);
  assert.equal(calls.filter((c) => c.name === "signInWithIdToken").length, 0);
  token = "mock-apple-token";
  available = false;
  await assert.rejects(() => signIn(), /chưa khả dụng/);
  calls.length = 0;
  platform.OS = "web";
  await signIn();
  await signIn(true);
  assert.deepEqual(
    calls.map((c) => c.name),
    ["signInWithOAuth", "linkIdentity"],
  );
  assert.equal(calls[0].value.provider, "apple");
  assert.equal(
    calls[0].value.options.redirectTo,
    "https://nep-nha-thu-chi.lunargem512.chatgpt.site/settings",
  );
  platform.OS = "android";
  await assert.rejects(() => signIn(), /chưa khả dụng/);
});
