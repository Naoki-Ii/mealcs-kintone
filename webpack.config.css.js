const path = require('path');
const glob = require('glob');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    console.log('env', argv.mode);
    // basePath の値が渡されている場合はそれを使用し、なければデフォルトのパスを使用
    const basePath = env.basePath ? path.resolve(env.basePath) : path.resolve('src', 'apps');
    const outputBasePath = path.relative(path.resolve('src', 'apps'), basePath);
    const styleEntries = glob.sync('**/style.css', { cwd: basePath }).reduce(
        (prev, file) => ({
            ...prev,
            [`${outputBasePath}/${path.dirname(file)}`]: path.resolve(basePath, file),
        }),
        {}
    );
    const OutPutPath = path.resolve(__dirname, isProduction ? 'dist' : 'dist-dev');
    return {
        entry: styleEntries,
        module: {
            rules: [
                {
                    test: /\.css$/,
                    exclude: /\.js$/,
                    use: [MiniCssExtractPlugin.loader, 'css-loader'],
                },
            ]
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: (chunkData) => {
                    return `${chunkDataServiceMap(chunkData)}style.min.css`;
                }
            }),
        ],
        optimization: {
            minimizer: [
                new CssMinimizerPlugin(),
            ],
        },
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