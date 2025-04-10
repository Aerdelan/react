const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './index.js',
    mode: 'development',
    // plugins: [
    //     new webpack.ProvidePlugin({
    //         adapter:     path.resolve(__dirname, '3rdparty/HiRTC/adapter.js'),
    //         Base64:      path.resolve(__dirname, '3rdparty/HiRTC/base64.js'),
    //         CryptoJs:    path.resolve(__dirname, '3rdparty/HiRTC/crypto-js.js'),
    //         saveAs:      path.resolve(__dirname, '3rdparty/HiRTC/saver.js'),
    //         hirtcwebsdk: path.resolve(__dirname, '3rdparty/HiRTC/hirtc-web-20231214.js'),
    //         jhkSign:     path.resolve(__dirname, '3rdparty/HiRTC/sign.js'),
    //     })
    // ],
    output: {
        filename: 'media-sdk.js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            name: 'mediaSdk',
            type: 'umd',
        },
    },
    devtool: 'source-map',
    watch: true,
    watchOptions: {
        aggregateTimeout: 600,
        ignored: /node_modules/,
    },
};