# 公開と権利に関するメモ

## EDINET DB

確認できた点:

- API Reference では `/v1/*` に CORS が有効で、ブラウザ JavaScript から直接呼べると明記されています
- API Documentation / API Reference では公開 REST API として案内されています

注意点:

- フッターに Terms of Service への導線はありますが、今回の確認では規約本文の全文までは取得できませんでした
- そのため、公開アプリで恒常的にデータを再配布する形が利用規約上問題ないかは、EDINET DB 運営への確認を推奨します

今回の判断:

- 個人利用前提のアプリとして実装
- 公開前には Terms of Service 本文確認と運営確認を推奨

## 株価データ

yfinance / Yahoo Finance 系で確認できた点:

- yfinance の PyPI 説明では、Yahoo Finance データは personal use only と案内されています
- したがって、不特定多数向けの公開サービス用途には慎重であるべきです

J-Quants 公式 FAQ で確認できた点:

- J-Quants API は個人の私的利用に限定
- データの第三者配信や、データを利用したアプリ提供は営利・非営利を問わず禁止

今回の判断:

- あなた本人がログインして PC / スマホから参照する個人用アプリとしては、Yahoo Finance 系価格データは候補にできる
- J-Quants は採用しない
- 不特定多数へ公開する形へ将来切り替える場合は、価格ソースを改めて見直す
