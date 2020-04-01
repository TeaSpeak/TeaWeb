const webpack = require("webpack");
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

let isDevelopment = process.env.NODE_ENV === 'development';
isDevelopment = true;
module.exports = {
    entry: path.join(__dirname, "app/index.ts"),
    devtool: 'inline-source-map',
    mode: "development",
    plugins: [
        new MiniCssExtractPlugin({
            filename: isDevelopment ? '[name].css' : '[name].[hash].css',
            chunkFilename: isDevelopment ? '[id].css' : '[id].[hash].css'
        }),
        new webpack.DefinePlugin({
            __build: {
                development: isDevelopment,
                version: '0000' //TODO!
            }
        })
    ],
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/,
                loader: [
                    //isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            sourceMap: isDevelopment
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: isDevelopment
                        }
                    }
                ]
            },
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,

                loader: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true
                        }
                    }
                ]
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', ".scss"],
        alias: { }
    },
    output: {
        filename: 'loader.js',
        path: path.resolve(__dirname, 'dist'),
        library: "loader",
        libraryTarget: "window" //"var" | "assign" | "this" | "window" | "self" | "global" | "commonjs" | "commonjs2" | "commonjs-module" | "amd" | "amd-require" | "umd" | "umd2" | "jsonp" | "system"
    },
    optimization: { }
};