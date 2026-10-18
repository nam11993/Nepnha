export type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
  length: number;
};
export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

// One user-controlled listening session may contain several browser sessions.
export function createSpeechSession(options: {
  create: () => Recognition;
  prefix: string;
  onText: (text: string) => void;
  onListening: (listening: boolean) => void;
  onError: (code: string) => void;
  schedule?: (callback: () => void) => () => void;
}) {
  let wanted = false;
  let active: Recognition | null = null;
  let cancelRestart: (() => void) | undefined;
  let committed = options.prefix.trim();
  let current = "";
  let emptyEnds = 0;
  const text = () => [committed, current].filter(Boolean).join(" ");
  const schedule =
    options.schedule ??
    ((callback) => {
      const timer = setTimeout(callback, 350);
      return () => clearTimeout(timer);
    });
  function stop() {
    wanted = false;
    cancelRestart?.();
    cancelRestart = undefined;
    options.onListening(false);
    // Keep final results emitted by stop(); abort() below discards late callbacks.
    try {
      active?.stop();
    } catch {
      abort();
    }
  }
  function abort() {
    wanted = false;
    cancelRestart?.();
    cancelRestart = undefined;
    const previous = active;
    active = null;
    if (previous) {
      previous.onresult = previous.onerror = previous.onend = null;
      try {
        previous.abort();
      } catch {
        /* Browser has already ended. */
      }
    }
  }
  function startBrowser() {
    if (!wanted) return;
    let recognition: Recognition;
    try {
      recognition = options.create();
    } catch {
      wanted = false;
      options.onListening(false);
      options.onError("start-failed");
      return;
    }
    active = recognition;
    current = "";
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      if (active !== recognition) return;
      current = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      const combined = text();
      options.onText(combined.slice(0, 500));
      if (combined.length >= 500) {
        options.onError("text-limit");
        stop();
      }
    };
    recognition.onerror = ({ error }) => {
      if (active !== recognition || !wanted) return;
      // Silence may end an iOS browser session; retry only a bounded number of times.
      if (error === "no-speech") return;
      options.onError(error);
      stop();
    };
    recognition.onend = () => {
      if (active !== recognition) return;
      active = null;
      committed = text().slice(0, 500);
      emptyEnds = current ? 0 : emptyEnds + 1;
      current = "";
      if (!wanted) return;
      if (emptyEnds >= 3) {
        wanted = false;
        options.onListening(false);
        options.onError("restart-unavailable");
        return;
      }
      cancelRestart = schedule(() => {
        cancelRestart = undefined;
        startBrowser();
      });
    };
    try {
      recognition.start();
    } catch {
      abort();
      options.onListening(false);
      options.onError("start-failed");
    }
  }
  return {
    start() {
      if (wanted) return;
      wanted = true;
      options.onListening(true);
      startBrowser();
    },
    stop,
    abort,
  };
}
