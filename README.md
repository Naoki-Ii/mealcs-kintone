# kintone
kintone開発環境雛形

### 初期読み込みおすすめ

```
https://code.jquery.com/jquery-3.6.0.min.js
```

```
https://code.jquery.com/ui/1.12.1/jquery-ui.js
```

```
https://js.cybozu.com/kintone-rest-api-client/4.1.0/KintoneRestAPIClient.min.js
```

### コマンド系

ホットリロード
```
BASE_PATH='src/apps/企業マスタ' npm run watch
```

ビルド(dev)

```
BASE_PATH='src/apps/企業マスタ' npm run dev
```

キントーンデプロイ

```
kintone-customize-uploader --base-url https://xxx.cybozu.com --username xxx --password xxx dist-dev/manifest/xxx.json
```

