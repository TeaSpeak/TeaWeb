import * as ts from "typescript";
import * as fs from "fs";
import trtransformer from "./tools/trgen/ts_transformer";

const path = require('path');
const webpack = require("webpack");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ManifestGenerator = require("./webpack/ManifestPlugin");
const WorkerPlugin = require('worker-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

export let isDevelopment = process.env.NODE_ENV === 'development';
console.log("Webpacking for %s (%s)", isDevelopment ? "development" : "production", process.env.NODE_ENV || "NODE_ENV not specified");
const generate_definitions = (target: string) => {
    const git_rev = fs.readFileSync(path.join(__dirname, ".git", "HEAD")).toString();
    let version;
    if(git_rev.indexOf("/") === -1)
        version = git_rev;
    else
        version = fs.readFileSync(path.join(__dirname, ".git", git_rev.substr(5).trim())).toString().substr(0, 7);

    return {
        "__build": {
            target: JSON.stringify(target),
            mode: JSON.stringify(isDevelopment ? "debug" : "release"),
            version: JSON.stringify(version),
            timestamp: Date.now(),
            entry_chunk_name: JSON.stringify(target === "web" ? "shared-app" : "client-app")
        } as BuildDefinitions
    } as any;
};

export const config = (target: "web" | "client") => { return {
    entry: {
        "loader": "./loader/app/index.ts"
    },

    devtool: isDevelopment ? "inline-source-map" : undefined,
    mode: isDevelopment ? "development" : "production",
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: isDevelopment ? '[name].css' : '[name].[hash].css',
            chunkFilename: isDevelopment ? '[id].css' : '[id].[hash].css'
        }),
        new ManifestGenerator({
            file: path.join(__dirname, "dist/manifest.json"),
            base: __dirname
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
        isDevelopment ? undefined : new webpack.optimize.AggressiveSplittingPlugin({
            minSize: 1024 * 8,
            maxSize: 1024 * 128
        }),
        new webpack.DefinePlugin(generate_definitions(target))
    ].filter(e => !!e),
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/,
                loader: [
                    isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
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
                            transpileOnly: true,
                            getCustomTransformers: (prog: ts.Program) => {
                                return {
                                    before: [trtransformer(prog, {
                                        optimized: true
                                    })]
                                };
                            }
                        }
                    }
                ]
            },
            {
                test: /\.was?t$/,
                loader: [
                    "./webpack/WatLoader.js"
                ]
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', ".scss"],
        alias: { },
    },
    externals: [
        {"tc-loader": "window loader"}
    ] as any[],
    output: {
        filename: (chunkData) => {
            if(chunkData.chunk.name === "loader")
                return "loader.js";
            return isDevelopment ? '[name].js' : '[contenthash].js';
        },
        path: path.resolve(__dirname, 'dist'),
        publicPath: "js/"
    },
    optimization: {
        splitChunks: {

        },
        minimize: !isDevelopment,
        minimizer: [new TerserPlugin()]
    }
}};