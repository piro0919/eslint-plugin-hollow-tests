"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LintMessage = {
  column: number;
  line: number;
  message: string;
  messageId: null | string;
};

type Sample = { code: string; name: string };

const SAMPLES: Sample[] = [
  {
    code: `it("saves the record", async () => {
  await save(record);
});
`,
    name: "no-assertion.test.js",
  },
  {
    code: `it("uses the button when present", () => {
  const hasButton = getButton() !== null;

  if (hasButton) {
    expect(getButton()).toBeVisible();
  }
});
`,
    name: "guarded.test.js",
  },
  {
    code: `function expectSaved(id) {
  expect(store.get(id)).toBeDefined();
}

it("saves", () => {
  save("1");
  expectSaved("1");
});
`,
    name: "helper.test.js",
  },
  {
    code: `test.beforeEach(() => {
  reset();
});

it("checks the value", () => {
  expect(sum(1, 2)).toBe(3);
});
`,
    name: "hooks.test.js",
  },
];

/** Line height of both the gutter and the editor, in pixels. */
const LINE_HEIGHT = 24;

export default function Home() {
  const [active, setActive] = useState(0);
  const [code, setCode] = useState(SAMPLES[0]?.code ?? "");
  const [error, setError] = useState<null | string>(null);
  const [messages, setMessages] = useState<LintMessage[]>([]);

  const lines = useMemo(() => code.split("\n"), [code]);
  /* Rows are positions, not data. Give them stable keys of their own so the
     highlight layer and the gutter stay in step with the textarea. */
  const rowNumbers = useMemo(() => lines.map((_, index) => index + 1), [lines]);
  const flagged = useMemo(
    () => new Set(messages.map((message) => message.line)),
    [messages],
  );

  const run = useCallback(async (source: string) => {
    setError(null);
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
    }
  }, []);

  // Lint once typing pauses, the way an editor would.
  useEffect(() => {
    const timer = setTimeout(() => void run(code), 350);
    return () => clearTimeout(timer);
  }, [code, run]);

  const openSample = useCallback((index: number) => {
    setActive(index);
    setCode(SAMPLES[index]?.code ?? "");
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0f] text-zinc-200">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-zinc-800 px-5 py-3">
        <h1 className="font-display text-base font-bold tracking-tight text-white">
          eslint-plugin-hollow-tests
        </h1>
        <p className="mr-auto text-xs text-zinc-500">
          Tests that pass without checking anything
        </p>
        <span className="font-mono text-xs text-zinc-500">no-hollow-test</span>
      </header>

      {/* Tabs, gutter, code, problems: the rule shown where it actually shows up. */}
      <main className="flex flex-1 flex-col">
        <div className="flex overflow-x-auto border-b border-zinc-800 bg-[#08080b]">
          {SAMPLES.map((sample, index) => (
            <button
              className={`border-r border-zinc-800 px-4 py-2.5 font-mono text-xs whitespace-nowrap transition-colors ${
                index === active
                  ? "bg-[#0b0b0f] text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
              key={sample.name}
              onClick={() => openSample(index)}
              type="button"
            >
              {sample.name}
            </button>
          ))}
        </div>

        <div className="flex flex-1">
          {/* gutter */}
          <div
            aria-hidden="true"
            className="w-14 shrink-0 border-r border-zinc-900 bg-[#08080b] py-4 text-right font-mono text-sm select-none"
            style={{ lineHeight: `${LINE_HEIGHT}px` }}
          >
            {rowNumbers.map((number) => {
              const hit = flagged.has(number);
              return (
                <div
                  className={`pr-3 ${hit ? "bg-amber-500/10 text-amber-400" : "text-zinc-700"}`}
                  key={`line-${number}`}
                >
                  {hit ? "●" : ""} {number}
                </div>
              );
            })}
          </div>

          {/* the code itself, with the reported lines lit behind it */}
          <div className="relative flex-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 py-4"
              style={{ lineHeight: `${LINE_HEIGHT}px` }}
            >
              {rowNumbers.map((number) => (
                <div
                  className={
                    flagged.has(number) ? "bg-amber-500/10" : undefined
                  }
                  key={`row-${number}`}
                  style={{ height: LINE_HEIGHT }}
                />
              ))}
            </div>
            <textarea
              aria-label="Code to lint"
              className="relative h-full min-h-72 w-full resize-none bg-transparent px-4 py-4 font-mono text-sm text-zinc-200 outline-none"
              onChange={(event) => setCode(event.target.value)}
              spellCheck={false}
              style={{ lineHeight: `${LINE_HEIGHT}px` }}
              value={code}
            />
          </div>
        </div>

        {/* problems panel */}
        <div className="border-t border-zinc-800 bg-[#08080b]">
          <div className="flex items-center gap-2 border-b border-zinc-900 px-5 py-2 font-mono text-[11px] tracking-wide text-zinc-500 uppercase">
            Problems
            <span
              className={`rounded-full px-2 py-0.5 ${
                messages.length > 0
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {messages.length}
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto px-5 py-3">
            {error ? (
              <p className="font-mono text-xs text-red-300">{error}</p>
            ) : messages.length === 0 ? (
              <p className="font-mono text-xs text-zinc-600">
                Nothing reported.
              </p>
            ) : (
              <ul className="space-y-2">
                {messages.map((message) => (
                  <li
                    className="flex gap-3 font-mono text-xs leading-relaxed"
                    key={`${message.line}:${message.column}:${message.messageId}`}
                  >
                    <span className="shrink-0 text-amber-400">
                      {message.line}:{message.column}
                    </span>
                    <span className="text-zinc-400">{message.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <p className="px-5 py-4 text-xs leading-relaxed text-zinc-600">
        <code className="text-zinc-500">expect-expect</code> checks whether a
        test body calls an assertion function. This rule also reports a body
        whose assertions all sit inside a branch, and it follows assertions
        moved into a helper within the same file. Edit any tab above and watch
        it re-run.
      </p>

      <footer className="flex flex-wrap items-center gap-4 border-t border-zinc-800 px-5 py-4 text-sm">
        <code className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-300">
          npm i -D eslint-plugin-hollow-tests
        </code>
        <a
          className="text-zinc-500 transition-colors hover:text-zinc-300"
          href="https://github.com/piro0919/eslint-plugin-hollow-tests"
          rel="noreferrer"
          target="_blank"
        >
          GitHub →
        </a>
        <a
          className="text-zinc-500 transition-colors hover:text-zinc-300"
          href="https://www.npmjs.com/package/eslint-plugin-hollow-tests"
          rel="noreferrer"
          target="_blank"
        >
          npm →
        </a>
        <a
          className="ml-auto text-zinc-600 transition-colors hover:text-zinc-400"
          href="https://kkweb.io/"
          rel="noreferrer"
          target="_blank"
        >
          kkweb.io
        </a>
      </footer>
    </div>
  );
}
