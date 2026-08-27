"use client";

import { useCallback, useEffect, useState } from "react";

type LintMessage = {
  column: number;
  line: number;
  message: string;
  messageId: null | string;
};

const SAMPLES: { code: string; label: string }[] = [
  {
    code: `it("saves the record", async () => {
  await save(record);
});`,
    label: "No assertion",
  },
  {
    code: `it("uses the button when present", () => {
  const hasButton = getButton() !== null;
  if (hasButton) {
    expect(getButton()).toBeVisible();
  }
});`,
    label: "Only inside a branch",
  },
  {
    code: `function expectSaved(id) {
  expect(store.get(id)).toBeDefined();
}

it("saves", () => {
  save("1");
  expectSaved("1");
});`,
    label: "Assertion in a helper",
  },
  {
    code: `test.beforeEach(() => {
  reset();
});

it("checks the value", () => {
  expect(sum(1, 2)).toBe(3);
});`,
    label: "A hook and a real test",
  },
];

export default function Home() {
  const [code, setCode] = useState(SAMPLES[0]?.code ?? "");
  const [error, setError] = useState<null | string>(null);
  const [messages, setMessages] = useState<LintMessage[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async (source: string) => {
    setError(null);
    setRunning(true);
    try {
      const response = await fetch("/api/lint", {
        body: JSON.stringify({ code: source }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as {
        error?: string;
        messages?: LintMessage[];
      };
      if (!response.ok)
        throw new Error(body.error ?? `HTTP ${response.status}`);
      setMessages(body.messages ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setMessages([]);
    } finally {
      setRunning(false);
    }
  }, []);

  // Lint as you type, once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => void run(code), 400);
    return () => clearTimeout(timer);
  }, [code, run]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 text-center">
          <h1 className="mb-2 font-display text-4xl font-bold tracking-tight text-white">
            hollow tests
          </h1>
          <p className="text-zinc-400">
            Tests that pass without checking anything
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
            <a
              className="rounded-full bg-zinc-700/50 px-4 py-2 text-zinc-300 transition-colors hover:bg-zinc-700"
              href="https://www.npmjs.com/package/eslint-plugin-hollow-tests"
              rel="noreferrer"
              target="_blank"
            >
              npm
            </a>
            <a
              className="rounded-full bg-zinc-700/50 px-4 py-2 text-zinc-300 transition-colors hover:bg-zinc-700"
              href="https://github.com/piro0919/eslint-plugin-hollow-tests"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>
        </header>

        <section className="mb-10">
          <div className="mb-3 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <button
                className="rounded-full bg-zinc-700/50 px-3.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
                key={sample.label}
                onClick={() => setCode(sample.code)}
                type="button"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <textarea
            aria-label="Code to lint"
            className="h-64 w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 font-mono text-sm text-zinc-200 outline-none focus:border-zinc-600"
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            value={code}
          />

          <div className="mt-4 min-h-16 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            {error ? (
              <p className="text-sm text-red-300">{error}</p>
            ) : running && messages.length === 0 ? (
              <p className="text-sm text-zinc-500">Linting…</p>
            ) : messages.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-300">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Nothing reported
              </p>
            ) : (
              <ul className="space-y-3">
                {messages.map((message) => (
                  <li
                    className="flex gap-3 text-sm"
                    key={`${message.line}:${message.column}:${message.messageId}`}
                  >
                    <span className="shrink-0 font-mono text-amber-400">
                      {message.line}:{message.column}
                    </span>
                    <span className="text-zinc-300">{message.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-white">
            Why not <code className="font-mono">expect-expect</code>
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-zinc-400">
            <code className="font-mono text-zinc-300">expect-expect</code>{" "}
            checks whether a test body contains a call to an assertion function.
            This rule also reports a body whose assertions all sit inside a
            branch, and it follows assertions moved into a helper within the
            same file.
          </p>

          <h2 className="mt-10 mb-4 font-display text-xl font-bold text-white">
            Install
          </h2>
          <pre className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 font-mono text-sm text-zinc-300">
            <code>npm install -D eslint-plugin-hollow-tests</code>
          </pre>

          <h2 className="mt-10 mb-4 font-display text-xl font-bold text-white">
            Usage
          </h2>
          <pre className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 font-mono text-sm text-zinc-300">
            <code>{`// eslint.config.js
import hollowTests from "eslint-plugin-hollow-tests";

export default [
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    plugins: { "hollow-tests": hollowTests },
    rules: { "hollow-tests/no-hollow-test": "error" },
  },
];`}</code>
          </pre>
        </section>

        <footer className="mt-16 text-center text-sm text-zinc-600">
          <a
            className="transition-colors hover:text-zinc-400"
            href="https://kkweb.io/"
            rel="noreferrer"
            target="_blank"
          >
            kkweb.io
          </a>
        </footer>
      </div>
    </div>
  );
}
