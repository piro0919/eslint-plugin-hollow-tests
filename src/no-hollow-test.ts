import type { Rule } from "eslint";
import type * as ESTree from "estree";

/**
 * 何も確かめずに緑になるテストを止める。
 *
 * 実際に積み上がるのは2つの形。
 *
 * 1. アサーションが1つも無い本体。書いたつもりで書けていない
 * 2. アサーションが分岐の内側にしか無い本体。`if (found) { expect(...) }` は
 *    条件が外れると1つも実行せずに通る
 *
 * どちらも型検査も lint も通り、テストの件数は増えるので、被覆されているように見える。
 */

/**
 * `it` / `test` の修飾子は明示的に並べる。`.*` で許すと `test.beforeEach` まで
 * 当たり、フックをテスト本体として数えてしまう。
 */
const TEST_MODIFIERS =
  /^(\.(only|skip|skipIf|runIf|concurrent|sequential|todo|fails|failing|each|for|extend))*$/;

const DEFAULT_TEST_NAMES = ["it", "test"];
const DEFAULT_ASSERTION_NAMES = ["expect", "assert"];
const DEFAULT_OPT_OUT = "hollow-test-ok";

type Options = {
  /** アサーションとみなす呼び出しの名前。既定は `expect` と `assert`。 */
  assertionNames?: string[];
  /** これを含むコメントが付いたテストは見逃す。理由を添えて書く。 */
  optOutComment?: string;
  /** テスト本体を作る呼び出しの名前。既定は `it` と `test`。 */
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

/** 呼び出しの先頭の名前。`test.each(...)` なら `test`、`foo.bar()` なら `foo`。 */
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
      // `test.each([...])("...", fn)` のように、呼び出しを重ねる形。
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
  return (
    testNames.includes(head ?? "") && TEST_MODIFIERS.test(rest.join(""))
  );
}

function isAssertionCall(node: AnyNode, assertionNames: string[]): boolean {
  if (node.type !== "CallExpression") return false;
  const callee = node.callee as AnyNode;
  if (callee.type === "Identifier") {
    return assertionNames.includes(String(callee.name));
  }
  // `assert.equal(...)` のような形も数える。
  if (callee.type === "MemberExpression") {
    const object = callee.object as AnyNode;
    return (
      object.type === "Identifier" && assertionNames.includes(String(object.name))
    );
  }
  return false;
}

/** ソース1本から、アサーションを内側に持つ名前付き関数を集める。 */
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
 * 分岐の外に置かれたアサーションの数。
 *
 * `if` の条件式そのものは必ず評価されるので、分岐の外として数える。
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
      // `found && expect(...)` は条件が外れると実行されない。
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
        // 式だけの本体（`() => expect(...)`）は分岐の外なので必ず実行される。
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
        "このテストのアサーションは分岐の内側にしかありません。条件が外れると1つも実行せずに通ります。",
      noAssertion:
        "このテストは何も確かめていません。アサーションがありません。",
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
