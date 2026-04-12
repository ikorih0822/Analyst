# 利用ガイド

## 基本フロー

1. Supabase URL と anon key を入力して保存
2. EDINET DB API key を入力して保存
3. ログイン
4. 銘柄コードや会社名で検索
5. EDINET DB から企業を取り込み
6. 概要、論点、調査ログ、予想を追加
7. 必要に応じて EDINET 再同期

## 決算タブ

- 実績: EDINET DB の四半期データを表示
- 予想: 自分で百万円単位で入力

## バリュエーションタブ

- bull / base / bear を手入力
- 株価推移は Yahoo Finance 系から取得

## 保存先

- 企業データ: Supabase
- 接続設定: 各ブラウザの localStorage
