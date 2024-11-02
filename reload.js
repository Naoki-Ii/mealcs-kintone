const { exec } = require('child_process');
const EnvConfig = require('./config/dev.json');

const basePath = process.env.BASE_PATH;
if (!basePath) {
  console.error('BASE_PATH 環境変数が設定されていません。');
  console.error('例: BASE_PATH=src/apps/アプリ名 node reload.js \n npm コマンド例: BASE_PATH=src/apps/アプリ名 npm run watch');
  process.exit(1);
}

// appIDを抽出する　src/apps/を取り除き、.アプリ名を取り除く
const FolderName = basePath.replace('src/apps/', '');
let appID = 0;
Object.keys(EnvConfig.APP).forEach((key) => {
  if (EnvConfig.APP[key].AppName == FolderName) {
    appID = EnvConfig.APP[key].AppID;
  }
});
const url = "https://" + EnvConfig.KINTONE_DOMAIN + ".cybozu.com/k/" + appID + "/";
// AppleScript command to reload the first tab of Google Chrome
const appleScript = `
tell application "Google Chrome"
  repeat with w in windows
    repeat with t in tabs of w
      if URL of t contains "${url}" then
        tell t to reload
      end if
    end repeat
  end repeat
end tell
`;

// Execute the AppleScript using osascript command
exec(`osascript -e '${appleScript}'`, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error: ${stderr}`);
    return;
  }
  console.log(`「${url}」を含むタブをリロードしました`);
});
