# デプロイ手順

## 1. Supabase 準備

1. Supabase プロジェクト作成
2. `supabase/schema.sql` を実行

## 2. GitHub 公開

1. このリポジトリを GitHub に push
2. GitHub Pages を branch root で有効化
3. 公開 URL にアクセス
4. 初回アクセス時に Supabase URL / anon key / EDINET DB API key を入力
5. サインアップまたはログイン

## 3. スマホ閲覧

- GitHub Pages の URL をスマホで開けば閲覧可能です
- データは Supabase に保存されるため、同じアカウントでログインすれば PC とスマホで共通になります

## 4. まだ未完の部分

- Yahoo Finance 系の取得は入れてあるが、系列の見た目はまだ簡易チャート
- より高度なテクニカル表示や期間切替は今後追加可能
