import type { Rule } from "eslint";
import type * as ESTree from "estree";

/**
 * Flag tests that pass without checking anything.
 *
 * Two shapes accumulate in real codebases.
 *
 * 1. A body with no assertion at all. Someone meant to write one and didn't.
 * 2. A body whose assertions live only inside a branch. `if (found) { expect(...) }`
 *    runs nothing at all when the condition is false.
 *
 * Both pass type checking and linting, and both raise the test count, so the code
 * looks covered. Neither is something a reader reliably notices.
 */

/**
 * List the modifiers explicitly. A `.*` pattern would also match `test.beforeEach`
 * and count hooks as test bodies.
 */
const TEST_MODIFIERS =
  /^(\.(only|skip|skipIf|runIf|concurrent|sequential|todo|fails|failing|each|for|extend))*$/;

const DEFAULT_TEST_NAMES = ["it", "test"];
const DEFAULT_ASSERTION_NAMES = ["expect", "assert"];
const DEFAULT_OPT_OUT = "hollow-test-ok";

type Options = {
  /** Calls that count as assertions. Defaults to `expect` and `assert`. */
  assertionNames?: string[];
  /** A test carrying a comment with this text is left alone. Write the reason next to it. */
  optOutComment?: string;
  /** Calls that introduce a test body. Defaults to `it` and `test`. */
  testNames?: string[];
};

type AnyNode = { type: string } & Record<string, unknown>;

function childNodes(node: AnyNode): AnyNode[] {
  const children: AnyNode[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && "type" in item) {
          children.push(item as AnyNode);
        }
      }
    } else if (value && typeof value === "object" && "type" in value) {
      children.push(value as AnyNode);
    }
  }
  return children;
}

/** The leading name of a call: `test` for `test.each(...)`, `foo` for `foo.bar()`. */
function rootName(node: AnyNode): null | string {
  let current: AnyNode | undefined = node;
  const suffix: string[] = [];
  while (current) {
    if (current.type === "Identifier") {
      return `${String(current.name)}${suffix.reverse().join("")}`;
    }
    if (current.type === "MemberExpression") {
      const property = current.property as AnyNode | undefined;
      if (property?.type === "Identifier") {
        suffix.push(`.${String(property.name)}`);
      } else {
        return null;
      }
      current = current.object as AnyNode | undefined;
      continue;
    }
    if (current.type === "CallExpression") {
      // Chained calls such as `test.each([...])("...", fn)`.
      current = current.callee as AnyNode | undefined;
      continue;
    }
    return null;
  }
  return null;
}

function isTestCall(node: AnyNode, testNames: string[]): boolean {
  const name = rootName(node.callee as AnyNode);
  if (!name) return false;
  const [head, ...rest] = name.split(/(?=\.)/);
  return testNames.includes(head ?? "") && TEST_MODIFIERS.test(rest.join(""));
}

function isAssertionCall(node: AnyNode, assertionNames: string[]): boolean {
  if (node.type !== "CallExpression") return false;
  const callee = node.callee as AnyNode;
  if (callee.type === "Identifier") {
    return assertionNames.includes(String(callee.name));
  }
  // Also count member forms such as `assert.equal(...)`.
  if (callee.type === "MemberExpression") {
    const object = callee.object as AnyNode;
    return (
      object.type === "Identifier" &&
      assertionNames.includes(String(object.name))
    );
  }
  return false;
}

/** Collect named functions in this file that assert somewhere inside. */
function collectAssertingHelpers(
  program: AnyNode,
  assertionNames: string[],
): Set<string> {
  const helpers = new Set<string>();
  const visit = (node: AnyNode): void => {
    const name = declaredFunctionName(node);
    if (name && containsAssertion(node, assertionNames)) helpers.add(name);
    for (const child of childNodes(node)) visit(child);
  };
  visit(program);
  return helpers;
}

function declaredFunctionName(node: AnyNode): null | string {
  if (node.type === "FunctionDeclaration") {
    const id = node.id as AnyNode | null;
    return id?.type === "Identifier" ? String(id.name) : null;
  }
  if (node.type === "VariableDeclarator") {
    const id = node.id as AnyNode;
    const init = node.init as AnyNode | null;
    if (
      id?.type === "Identifier" &&
      init &&
      (init.type === "ArrowFunctionExpression" ||
        init.type === "FunctionExpression")
    ) {
      return String(id.name);
    }
  }
  return null;
}

function containsAssertion(node: AnyNode, assertionNames: string[]): boolean {
  if (isAssertionCall(node, assertionNames)) return true;
  return childNodes(node).some((child) =>
    containsAssertion(child, assertionNames),
  );
}

function callsHelper(node: AnyNode, helpers: Set<string>): boolean {
  if (node.type === "CallExpression") {
    const name = rootName(node.callee as AnyNode);
    if (name && helpers.has(name.split(".")[0] ?? "")) return true;
  }
  return childNodes(node).some((child) => callsHelper(child, helpers));
}

/**
 * How many assertions sit outside every branch.
 *
 * The test of an `if` always evaluates, so it counts as outside.
 */
function unguardedAssertions(
  node: AnyNode,
  assertionNames: string[],
  guarded = false,
): number {
  let count = isAssertionCall(node, assertionNames) && !guarded ? 1 : 0;
  for (const child of childNodes(node)) {
    let childGuarded = guarded;
    if (node.type === "IfStatement" || node.type === "ConditionalExpression") {
      childGuarded = guarded || child !== (node.test as unknown);
    } else if (
      node.type === "LogicalExpression" &&
      (node.operator === "&&" || node.operator === "||")
    ) {
      // `found && expect(...)` does not run when the condition fails.
      childGuarded = guarded || child !== (node.left as unknown);
    } else if (node.type === "SwitchCase" || node.type === "CatchClause") {
      childGuarded = true;
    }
    count += unguardedAssertions(child, assertionNames, childGuarded);
  }
  return count;
}

export const noHollowTest: Rule.RuleModule = {
  create(context) {
    const options = (context.options[0] ?? {}) as Options;
    const assertionNames = options.assertionNames ?? DEFAULT_ASSERTION_NAMES;
    const testNames = options.testNames ?? DEFAULT_TEST_NAMES;
    const optOut = options.optOutComment ?? DEFAULT_OPT_OUT;
    const source = context.sourceCode;
    let helpers: Set<string> | null = null;

    return {
      CallExpression(node: ESTree.CallExpression): void {
        const call = node as unknown as AnyNode;
        if (!isTestCall(call, testNames)) return;

        const args = node.arguments;
        const body = args.find(
          (arg) =>
            arg.type === "ArrowFunctionExpression" ||
            arg.type === "FunctionExpression",
        );
        if (!body) return;
        const fn = body as unknown as AnyNode;
        const fnBody = fn.body as AnyNode | undefined;
        // An expression body such as `() => expect(...)` is outside every branch,
        // so it always runs.
        if (!fnBody) return;

        const comments = [
          ...source.getCommentsBefore(node as never),
          ...source.getCommentsInside(node as never),
        ];
        if (comments.some((comment) => comment.value.includes(optOut))) return;

        helpers ??= collectAssertingHelpers(
          source.ast as unknown as AnyNode,
          assertionNames,
        );
        if (callsHelper(fnBody, helpers)) return;

        if (!containsAssertion(fnBody, assertionNames)) {
          context.report({ messageId: "noAssertion", node });
          return;
        }
        if (unguardedAssertions(fnBody, assertionNames) === 0) {
          context.report({ messageId: "guardedOnly", node });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow tests that pass without checking anything — no assertion at all, or assertions only inside a branch",
      recommended: true,
      url: "https://github.com/piro0919/eslint-plugin-hollow-tests#no-hollow-test",
    },
    messages: {
      guardedOnly:
        "Every assertion in this test sits inside a branch. The test passes without running any of them when the condition is false.",
      noAssertion: "This test checks nothing. It has no assertion.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          assertionNames: { items: { type: "string" }, type: "array" },
          optOutComment: { type: "string" },
          testNames: { items: { type: "string" }, type: "array" },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};
