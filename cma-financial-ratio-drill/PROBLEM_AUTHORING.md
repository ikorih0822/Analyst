# Codex向け 問題追加メモ

計算問題を追加するときは、原則として `codex-problems.js` の `window.CMA_EXTRA_CALC_PROBLEMS` に問題オブジェクトを追記する。

## 問題オブジェクト

```js
{
  id: "advanced-example-id",
  title: "問題タイトル",
  category: "応用",
  prompt: "問題文",
  data: [
    { label: "項目名", value: "数値" }
  ],
  answer: 12.3,
  tolerance: 0.05,
  unit: "%",
  precision: 1,
  formula: "使う式",
  explanation: "途中計算と答え"
}
```

## 作問ルール

- `answer` は数値だけにする。単位は `unit` に入れる。
- 百分率の答えは `0.123` ではなく `12.3` のように入力値と同じ形にする。
- `tolerance` は許容誤差。小数第1位問題なら `0.05`、小数第2位問題なら `0.005` が目安。
- `explanation` には途中式を入れるが、アプリでは判定後または答え表示後だけ出る。
- 証券アナリスト試験対策では、単純代入だけでなく以下を優先して作る。
  - 期首・期末平均を使う問題
  - ROE分解の逆算
  - PER、PBR、ROEの関係
  - 配当性向、内部留保率、持続可能成長率
  - 財務取引後の安全性指標の変化
  - 回転率から回転期間、またはCCCを求める問題

## 依頼例

「Codex、ROE分解とPBRを題材に応用問題を10問追加して」

「Codex、インタレスト・カバレッジ・レシオの引っかけ問題を5問追加して」

