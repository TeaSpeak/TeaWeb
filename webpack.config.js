const path = require('path');
const webpack = require("webpack");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ManifestGenerator = require("./webpack/ManifestPlugin");
const WorkerPlugin = require('worker-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isDevelopment = process.env.NODE_ENV === 'development';
module.exports = {
    entry: {
        //"shared-app": "./shared/js/main.ts"
        "shared-app": "./web/js/index.ts"
    },
    devtool: 'inline-source-map',
    mode: "development",
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: isDevelopment ? '[name].css' : '[name].[hash].css',
            chunkFilename: isDevelopment ? '[id].css' : '[id].[hash].css'
        }),
        new ManifestGenerator({
            file: path.join(__dirname, "dist/manifest.json")
        }),
        new WorkerPlugin(),
        //new BundleAnalyzerPlugin()
        /*
        new CircularDependencyPlugin({
            //exclude: /a\.js|node_modules/,
            failOnError: true,
            allowAsyncCycles: false,
            cwd: process.cwd(),
        })
         */
        new webpack.optimize.AggressiveSplittingPlugin({
            minSize: 1024 * 128,
            maxSize: 1024 * 1024
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
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', ".scss"],
        alias: {
            "tc-shared": path.resolve(__dirname, "shared/js"),
            "tc-backend/web": path.resolve(__dirname, "web/js"),
            "tc-backend": path.resolve(__dirname, "web/js"),
            "tc-generated/codec/opus": path.resolve(__dirname, "asm/generated/TeaWeb-Worker-Codec-Opus.js"),
            //"tc-backend": path.resolve(__dirname, "shared/backend.d"),
        },
    },
    externals: {
        "tc-loader": "window loader"
    },
    output: {
        filename: '[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: "js/"
    },
    optimization: {
        splitChunks: { }
    }
};