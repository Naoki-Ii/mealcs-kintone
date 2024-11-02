const fs = require('fs');
const path = require('path');
const deployAppID = [];
const scopePath = process.env.BASE_PATH || '';
const dirPath = path.resolve(__dirname, 'src/apps');
const env = process.env.MODE || 'dev';
const EnvFolderName = (env === 'dev') ? 'dist-dev' : 'dist';
const checkpath = path.resolve(__dirname, EnvFolderName, 'manifest');
const envConfig = JSON.parse(
    fs.readFileSync(
        `./config/${env}.json`,
        'utf8'
    )
);
for (const folderName of fs.readdirSync(dirPath)) {
    if (scopePath != '' && "src/apps/" + folderName != scopePath) {
        continue;
    }
    let ThisAppID = 0;
    Object.keys(envConfig.APP).forEach(key => {
        if (envConfig.APP[key].AppName == folderName) {
            ThisAppID = envConfig.APP[key].AppID;
        }
    });
    console.log("ThisAppID", ThisAppID);

    if (ThisAppID == 0) {
        console.log(`BASE_PATHとconfig/${env}.jsonのAppNameが一致しません`);
        continue;
    }

    if (!fs.existsSync(checkpath + "/" + ThisAppID + ".json")) {
        deployAppID.push(ThisAppID);
        const json = {
            "app": ThisAppID,
            "scope": "ALL",
            "desktop": {
                "js": [
                    EnvFolderName + "/" + folderName + "/index.js"
                ],
                "css": [
                    EnvFolderName + "/" + folderName + "/style.min.css"
                ]
            },
            "mobile": {
                "js": [],
                "css": []
            }
        };
        // ファイルパスを指定
        const filePath = path.resolve(__dirname, EnvFolderName, 'manifest', ThisAppID + '.json');
        // JSONを文字列に変換
        const jsonString = JSON.stringify(json, null, 2);
        console.log(folderName);
        // ファイルを生成
        fs.writeFile(filePath, jsonString, err => {
            if (err) {
                console.error('manifest生成中にエラーが発生しました:', err);
            } else {
                console.log('manifestファイルが正常に生成されました');
            }
        });
    }
}

const dirPath2 = path.resolve(__dirname, '');
for (const folderName of fs.readdirSync(dirPath2)) {
    if (folderName == "deployall") {
        // txtを生成
        let txt = "";
        for (const appID of deployAppID) {
            txt += "kintone-customize-uploader --base-url 'https://" + envConfig.KINTONE_DOMAIN + ".cybozu.com' --username 'admin-user' --password '!nJSs6p5Y*Zp' " + EnvFolderName + "/manifest/" + appID + ".json" + "\n";
        }
        // ファイルパスを指定
        const filePath = path.resolve(__dirname, 'deployall');
        // ファイルを生成
        fs.writeFile(filePath, txt, err => {
            if (err) {
                console.error('deployall生成中にエラーが発生しました:', err);
            }
        });
    }
}