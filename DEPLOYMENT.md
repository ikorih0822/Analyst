# デプロイ手順

## 1. Supabase 準備

1. Supabase プロジェクト作成
2. `supabase/schema.sql` を実行
3. `sync-company` Edge Function をデプロイ
4. `EDINETDB_API_KEY` を secret に登録

## 2. GitHub 公開

1. このリポジトリを GitHub に push
2. GitHub Pages を branch root で有効化
3. 公開 URL にアクセス
4. 初回アクセス時に Supabase URL / anon key を入力
5. サインアップまたはログイン

## 3. スマホ閲覧

- GitHub Pages の URL をスマホで開けば閲覧可能です
- データは Supabase に保存されるため、同じアカウントでログインすれば PC とスマホで共通になります

## 4. まだ未完の部分

- 株価自動取得は価格ソースの権利確認後に接続
- そのため Valuation タブの価格チャートは現時点ではプレースホルダ表示です
