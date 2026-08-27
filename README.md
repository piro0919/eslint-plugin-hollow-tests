# eslint-plugin-hollow-tests

何も確かめずに緑になるテストを止める。

```js
// ❌ アサーションが1つも無い
it("記録を保存する", async () => {
  await save(record);
});

// ❌ アサーションが分岐の内側にしかない。条件が外れると1つも実行せずに通る
it("ボタンがあれば押せる", () => {
  if (hasButton) {
    expect(getButton()).toBeVisible();
  }
});
```

どちらも型検査も lint も通り、テストの件数は増えるので、被覆されているように見える。人が読んで気づく形ではない。

## `expect-expect` との違い

`vitest/expect-expect` と `jest/expect-expect` は「そのテスト本体に assert 関数の呼び出しがあるか」を見る。この規則は2歩踏み込む。

| | expect-expect | hollow-tests |
| ---- | ---- | ---- |
| アサーションが無い本体 | 拾う | 拾う |
| 分岐の内側にしか無い本体 | 見逃す | **拾う** |
| 判定をヘルパーへ寄せた書き方 | 名前を設定に列挙する必要がある | **同じファイル内なら自動で追う** |

分岐の内側だけ、と数えるのは `if` / 三項演算子 / `&&` `||` の右側 / `switch` の `case` / `catch`。`if` の条件式そのものは必ず評価されるので、分岐の外として数える。

## 導入

```bash
npm install -D eslint-plugin-hollow-tests
```

```js
// eslint.config.js
import hollowTests from "eslint-plugin-hollow-tests";

export default [
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "e2e/**/*.ts"],
    plugins: { "hollow-tests": hollowTests },
    rules: { "hollow-tests/no-hollow-test": "error" },
  },
];
```

用意した設定をそのまま並べてもよい。テストファイルにだけ当てること。

```js
import { recommended } from "eslint-plugin-hollow-tests";

export default [{ ...recommended, files: ["**/*.test.ts"] }];
```

## 設定

```js
"hollow-tests/no-hollow-test": ["error", {
  assertionNames: ["expect", "assert"],
  testNames: ["it", "test"],
  optOutComment: "hollow-test-ok",
}]
```

| 名前 | 既定 | 説明 |
| ---- | ---- | ---- |
| `assertionNames` | `["expect", "assert"]` | アサーションとみなす呼び出し。`assert.equal(...)` のような形も数える |
| `testNames` | `["it", "test"]` | テスト本体を作る呼び出し。修飾子（`.skip` `.each` など）は自動で付いてよい |
| `optOutComment` | `"hollow-test-ok"` | これを含むコメントが付いたテストは見逃す |

## 見逃す

確かめないことに理由があるなら、その理由と一緒に書く。

```js
// hollow-test-ok 例外が飛ばないことだけを確かめている
it("描画で落ちない", () => {
  render(<App />);
});
```

## 拾わないもの

- フック。`test.beforeEach` のような形をテスト本体として数えない。修飾子は明示的に並べてあり、`.*` では許していない
- 式だけの本体。`() => expect(a).toBe(1)` は必ず実行される
- 別ファイルのヘルパー。アサーションの追跡は同じファイルの中だけ。またぐ場合は `assertionNames` にその名前を足す

## ライセンス

MIT
