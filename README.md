# mealcs-kintone

株式会社ミールケアサービス kintoneカスタマイズ開発環境

## プロジェクト概要

kintoneアプリのカスタマイズ（JavaScript/TypeScript/CSS）を管理・ビルド・デプロイするプロジェクトです。

## 技術スタック

- TypeScript / JavaScript (ES6)
- Webpack 5
- Babel
- CSS / Mini CSS Extract Plugin
- @kintone/rest-api-client
- kintone-customize-uploader

## ディレクトリ構造

```
mealcs-kintone/
├── src/
│   ├── apps/                    # 各アプリのカスタマイズコード
│   │   ├── 発注管理/
│   │   ├── 施設情報管理/
│   │   ├── 数量管理/
│   │   ├── 区分期限設定/
│   │   ├── 項目管理/
│   │   ├── 履歴管理/
│   │   ├── チェック項目保存/
│   │   ├── バナー表示管理/
│   │   └── 管理画面設定/
│   └── typescript/              # 共通TypeScriptユーティリティ
│       ├── libs/
│       │   └── envConfig.ts     # 環境設定取得
│       └── utils/
│           └── getEnvVars.ts    # アプリID別設定取得
├── config/
│   ├── dev.json                 # 開発環境設定（アプリID等）
│   └── prd.json                 # 本番環境設定（アプリID等）
├── dist/                        # 本番ビルド出力
├── dist-dev/                    # 開発ビルド出力
├── webpack.config.js            # JS/TSビルド設定
├── webpack.config.css.js        # CSSビルド設定
└── manifest-make.js             # デプロイ用manifestファイル生成
```

## 各アプリ構造

各アプリフォルダは以下の構成になっています：

```
src/apps/アプリ名/
├── index.js (または index.ts)   # エントリーポイント
├── js/                          # 追加JSファイル
├── css/                         # 追加CSSファイル
└── style.css                    # メインスタイル
```

## コマンド

### ホットリロード開発

```bash
BASE_PATH='src/apps/発注管理' npm run watch
```

### ビルド（開発環境）

```bash
BASE_PATH='src/apps/発注管理' npm run dev
```

### ビルド（本番環境）

```bash
BASE_PATH='src/apps/発注管理' npm run prd
```

### kintoneへデプロイ

```bash
kintone-customize-uploader --base-url https://xxx.cybozu.com --username xxx --password xxx dist-dev/manifest/xxx.json
```

## kintone初期読み込み推奨ライブラリ

kintoneアプリのカスタマイズ設定で以下のCDNを読み込むことを推奨：

```
https://code.jquery.com/jquery-3.6.0.min.js
```

```
https://code.jquery.com/ui/1.12.1/jquery-ui.js
```

```
https://js.cybozu.com/kintone-rest-api-client/4.1.0/KintoneRestAPIClient.min.js
```

## 環境設定

`config/dev.json` と `config/prd.json` にアプリIDやドメイン情報を設定します。
ビルド時に `--mode development` または `--mode production` で切り替わります。
