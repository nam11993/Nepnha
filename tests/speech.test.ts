import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSpeechSession,
  type Recognition,
} from "../src/speech-session.ts";
function setup() {
  const browsers: Recognition[] = [];
  const pending: (() => void)[] = [];
  const texts: string[] = [],
    errors: string[] = [],
    listening: boolean[] = [];
  let aborts = 0,
    stops = 0;
  const session = createSpeechSession({
    prefix: "Đã ghi",
    create() {
      const browser: Recognition = {
        lang: "",
        continuous: false,
        interimResults: false,
        maxAlternatives: 0,
        onresult: null,
        onerror: null,
        onend: null,
        start() {},
        stop() {
          stops++;
        },
        abort() {
          aborts++;
        },
      };
      browsers.push(browser);
      return browser;
    },
    onText: (text) => texts.push(text),
    onError: (code) => errors.push(code),
    onListening: (value) => listening.push(value),
    schedule(callback) {
      pending.push(callback);
      return () => {
        const at = pending.indexOf(callback);
        if (at >= 0) pending.splice(at, 1);
      };
    },
  });
  const result = (browser: Recognition, ...parts: string[]) =>
    browser.onresult?.({
      results: parts.map((transcript) => ({
        isFinal: true,
        length: 1,
        0: { transcript },
      })),
    });
  return {
    session,
    browsers,
    pending,
    texts,
    errors,
    listening,
    result,
    counts: () => ({ aborts, stops }),
  };
}
test("continuous dictation preserves cumulative results across automatic browser restarts", () => {
  const s = setup();
  s.session.start();
  assert.equal(s.browsers[0].continuous, true);
  s.result(s.browsers[0], "mua nước");
  s.result(s.browsers[0], "mua nước 156 ca", "mua máy sáu củ");
  s.browsers[0].onend?.();
  s.pending.shift()?.();
  s.result(s.browsers[1], "mua nhà hai tỏi");
  assert.equal(
    s.texts.at(-1),
    "Đã ghi mua nước 156 ca mua máy sáu củ mua nhà hai tỏi",
  );
  s.session.stop();
  // Some browsers supply the last phrase only after stop().
  s.result(s.browsers[1], "mua nhà hai tỏi hôm nay");
  s.browsers[1].onend?.();
  assert.equal(
    s.texts.at(-1),
    "Đã ghi mua nước 156 ca mua máy sáu củ mua nhà hai tỏi hôm nay",
  );
  assert.equal(s.pending.length, 0);
  assert.equal(s.listening.at(-1), false);
});
test("manual stop or unmount cancels pending microphone restarts and ignores late events", () => {
  for (const action of ["stop", "abort"] as const) {
    const s = setup();
    s.session.start();
    const stale = s.browsers[0].onresult!;
    s.browsers[0].onend?.();
    s.session[action]();
    assert.equal(s.pending.length, 0);
    stale({
      results: [{ isFinal: true, length: 1, 0: { transcript: "late" } }],
    });
    assert.equal(s.texts.length, 0);
  }
});
test("permission/network failures do not reopen microphone, repeated silence is bounded", () => {
  for (const error of ["not-allowed", "network", "audio-capture"]) {
    const s = setup();
    s.session.start();
    s.browsers[0].onerror?.({ error });
    s.browsers[0].onend?.();
    assert.equal(s.pending.length, 0);
    assert.deepEqual(s.errors, [error]);
  }
  const s = setup();
  s.session.start();
  for (let i = 0; i < 3; i++) {
    s.browsers[i].onerror?.({ error: "no-speech" });
    s.browsers[i].onend?.();
    s.pending.shift()?.();
  }
  assert.equal(s.browsers.length, 3);
  assert.deepEqual(s.errors, ["restart-unavailable"]);
});
test("dictation stops at the API text limit without erasing received speech", () => {
  const s = setup();
  s.session.start();
  s.result(s.browsers[0], "a".repeat(600));
  assert.equal(s.texts.at(-1)?.length, 500);
  assert.ok(s.counts().stops > 0);
  s.browsers[0].onend?.();
  assert.equal(s.pending.length, 0);
  assert.deepEqual(s.errors, ["text-limit"]);
});
