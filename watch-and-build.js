const { exec } = require('child_process');
const chokidar = require('chokidar');
const _ = require('lodash');

const basePath = process.env.BASE_PATH;
if (!basePath) {
    console.error('BASE_PATH 環境変数が設定されていません。');
    console.error('例: BASE_PATH=src/apps/アプリ名 node watch-and-build.js\n npm コマンド例: BASE_PATH=src/apps/アプリ名 npm run watch');
    process.exit(1);
}
const webpackCmd = `npx webpack --mode development --env basePath='${basePath}' --config webpack.config.css.js && webpack --mode development --env basePath='${basePath}' --config webpack.config.js`;

// 初期ビルド
exec(webpackCmd, (error, stdout, stderr) => {
    if (error) {
        console.error(`初期ビルドエラー: ${error}`);
        console.log(stdout);
        console.error(stderr);
        return;
    }
    console.log('初期ビルドが完了しました');
    // basePathから src/app/を削除する
    const OutPutJS = 'https://127.0.0.1:5500/dist-dev/' + basePath.replace('src/apps/', '') + '/index.js';
    const OutPutCSS = 'https://127.0.0.1:5500/dist-dev/' + basePath.replace('src/apps/', '') + '/style.min.css';
    console.log("JS", OutPutJS);
    console.log("CSS", OutPutCSS);
});

// 監視ディレクトリの設定
const watcher = chokidar.watch(basePath);

// ファイル変更時の処理
const debounceBuild = _.debounce((path) => {
    console.log(`${path} が変更されました`);
    console.log('再ビルドを開始します');
    exec(webpackCmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`再ビルドエラー: ${error}`);
            console.log(stdout);
            console.error(stderr);
            return;
        }
        const d = new Date();
        console.log(`再ビルドが完了しました (${d.toLocaleString()})`);
        exec(`BASE_PATH='${basePath}' node reload.js`, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error: ${stderr}`);
                return;
            }
            console.log(stdout);
        });
    });
}, 300);


watcher.on('change', (path) => {
    debounceBuild(path);
});