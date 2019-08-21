//Webpack configuration file

var webpack = require('webpack');
var path = require('path');
var fs = require("fs");

var plugins = [], outputFile;
var APP_NAME = 'jquery.lsxemojipicker';

outputFile = APP_NAME + '.min.js';

module.exports = (env) => {
    if(false && env === 'production'){
        console.log('Production mode enabled');
        plugins.push(new webpack.optimize.UglifyJsPlugin({
            beautify: false,
            comments: false,
            sourceMap: false,
            compress: {
                screw_ie8: true,
                warnings: false
            },
            mangle: {
                keep_fnames: true,
                screw_i8: true
            }
        }));
    } else {
        console.log('Development mode enabled');        
    }
    //Banner plugin for license
    plugins.push(new webpack.BannerPlugin(fs.readFileSync('./LICENSE', 'utf8')));
    plugins.push(new webpack.DefinePlugin({
        PRODUCTION_MODE: env === 'production'
    }));

    return {
        entry: [
            __dirname + '/src/jquery.lsxemojipicker.css',
            __dirname + '/src/jquery.lsxemojipicker.js'
        ],
        devtool: 'source-map',
        output: {
            path: __dirname,
            filename: outputFile,
            library: APP_NAME,
            libraryTarget: 'umd',
            umdNamedDefine: true
        },
        module: {
            loaders: [
                { test: /\.s?css/, loader: "style-loader!css-loader" }
            ]
        },
        plugins: plugins
    };
}
