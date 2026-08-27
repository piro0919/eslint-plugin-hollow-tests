import { Linter } from "eslint";
import { NextResponse } from "next/server";
import { noHollowTest } from "../../../no-hollow-test";

/**
 * Runs the rule against a snippet for the demo on the landing page.
 *
 * The linting happens here rather than in the browser so ESLint itself does not
 * have to be bundled for the client.
 */

export const runtime = "nodejs";

const MAX_LENGTH = 20_000;

const linter = new Linter();

export async function POST(request: Request): Promise<Response> {
  let code: unknown;
  try {
    ({ code } = (await request.json()) as { code?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof code !== "string") {
    return NextResponse.json(
      { error: "code must be a string" },
      { status: 400 },
    );
  }
  if (code.length > MAX_LENGTH) {
    return NextResponse.json({ error: "code is too long" }, { status: 413 });
  }

  const messages = linter.verify(code, {
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    plugins: { "hollow-tests": { rules: { "no-hollow-test": noHollowTest } } },
    rules: { "hollow-tests/no-hollow-test": "error" },
  });

  return NextResponse.json({
    messages: messages.map((message) => ({
      column: message.column,
      line: message.line,
      message: message.message,
      messageId: message.messageId ?? null,
      ruleId: message.ruleId ?? null,
    })),
  });
}
