const path = require('path');
const glob = require('glob');
const { readFileSync } = require('fs');
const webpack = require('webpack');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    // basePath の値が渡されている場合はそれを使用し、なければデフォルトのパスを使用
    const basePath = env.basePath ? path.resolve(env.basePath) : path.resolve('src', 'apps');
    // 出力先のベースパスを取得（例: "398.国籍コード"）
    const outputBasePath = path.relative(path.resolve('src', 'apps'), basePath);
    const scriptEntries = glob.sync('**/index.+(js|ts|tsx)', { cwd: basePath }).reduce(
        (prev, file) => ({
            ...prev,
            [`${outputBasePath}/${path.dirname(file)}`]: path.resolve(basePath, file),
        }),
        {}
    );

    const envConfig = JSON.parse(
        readFileSync(
            `./config/${isProduction ? 'prd' : 'dev'}.json`,
            'utf8'
        )
    );

    const OutPutPath = path.resolve(__dirname, isProduction ? 'dist' : 'dist-dev');

    return {
        entry: scriptEntries,
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                },
                {
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    '@babel/preset-env',
                                    {
                                        useBuiltIns: 'usage',
                                        corejs: 3,
                                    },
                                ],
                            ],
                        },
                    },
                }
            ],
        },
        resolve: {
            extensions: ['.ts', '.js', '.json', '.wasm'],
        },
        plugins: [
            new webpack.EnvironmentPlugin({
                KINTONE_OV_CONFIG: JSON.stringify(envConfig),
            }),
        ],
        output: {
            path: OutPutPath,
            filename: (chunkData) => {
                return `${chunkDataServiceMap(chunkData)}index.js`;
            }
        }
    };
};

// chunkDataからサービスマップ名を取得するヘルパー関数
function chunkDataServiceMap(chunkData) {
    let name = chunkData.chunk.name;
    // 最後が.の場合は削除
    if (name.slice(-1) === '.') {
        name = name.slice(0, -1);
    }
    // 最後が/なら何もしないが、そうでない場合は/を追加
    if (name.slice(-1) !== '/') {
        name += '/';
    }
    return name;
};
