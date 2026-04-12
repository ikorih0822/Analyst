# 日本株リサーチ・コックピット

日本株の企業調査を一人で蓄積するための、Supabase バックエンド付き静的ウェブアプリです。

## この版でできること

- Supabase Auth で自分専用ログイン
- RLS 付きで自分の企業データだけ保存
- EDINET DB から会社情報、年次財務、四半期財務、比率、AI要約、最近の TDNet 決算を取得
- 決算タブで四半期実績表を自動表示
- 次回予想は手入力で保存
- 調査ログ、論点、投資仮説、シナリオを保存
- GitHub Pages に載せやすい静的フロント構成

## セットアップ

### 1. Supabase プロジェクトを作成

作成後に以下を控えます。

- Project URL
- anon public key

### 2. SQL を流す

`supabase/schema.sql` を Supabase SQL Editor で実行します。

### 3. Edge Function をデプロイ

`supabase/functions/sync-company/index.ts` をデプロイし、`EDINETDB_API_KEY` を secret に設定します。

例:

- `supabase functions deploy sync-company`
- `supabase secrets set EDINETDB_API_KEY=...`

### 4. フロントを開く

`index.html` を開き、サイドバーに以下を入力します。

- Supabase URL
- Supabase anon key

その後ログインします。

## GitHub Pages 公開

このアプリはビルド不要の静的サイトです。

1. GitHub に push
2. Repository Settings -> Pages
3. Branch と root を選択
4. 公開 URL を開く

## 重要な権利メモ

- EDINET DB API は公開 CORS でブラウザ利用可能です
- ただし、公開アプリでの継続的な再配布可否は利用規約本文の確認と運営確認を推奨します
- Yahoo Finance 系データは `yfinance` の案内でも personal use only とされています
- そのため、この版の株価取得は「あなた本人がログインして参照する用途」を前提にしています
- J-Quants は個人私的利用限定で、アプリ提供禁止と読めるため採用していません

## 次の拡張候補

- 価格系列の見た目改善
- 週次レビュー自動生成
- スマホ向けカード UI の追加改善
