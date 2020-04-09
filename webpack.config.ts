import * as ts from "typescript";
import * as fs from "fs";
import trtransformer from "./tools/trgen/ts_transformer";
import {exec} from "child_process";
import * as util from "util";
import EJSGenerator = require("./webpack/EJSGenerator");

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
const generate_definitions = async (target: string) => {
    const git_rev = fs.readFileSync(path.join(__dirname, ".git", "HEAD")).toString();
    let version;
    if(git_rev.indexOf("/") === -1)
        version = git_rev;
    else
        version = fs.readFileSync(path.join(__dirname, ".git", git_rev.substr(5).trim())).toString().substr(0, 7);

    let timestamp;
    try {
        const { stdout } = await util.promisify(exec)("git show -s --format=%ct");
        timestamp = parseInt(stdout.toString());
        if(isNaN(timestamp)) throw "failed to parse timestamp '" + stdout.toString() + "'";
    } catch (error) {
        console.error("Failed to get commit timestamp: %o", error);
        throw "failed to get commit timestamp";
    }
    return {
        "__build": {
            target: JSON.stringify(target),
            mode: JSON.stringify(isDevelopment ? "debug" : "release"),
            version: JSON.stringify(version),
            timestamp: timestamp,
            entry_chunk_name: JSON.stringify(target === "web" ? "shared-app" : "client-app")
        } as BuildDefinitions
    } as any;
};

export const config = async (target: "web" | "client") => { return {
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
        new webpack.DefinePlugin(await generate_definitions(target)),

        new EJSGenerator({
            variables: {
                build_target: target
            },
            input: path.join(__dirname, "shared/html/index.html.ejs"),
            output: path.join(__dirname, "dist/index.html"),
            initialJSEntryChunk: "loader",
            minify: !isDevelopment,
            embedInitialJSEntryChunk: !isDevelopment,

            embedInitialCSSFile: !isDevelopment,
            initialCSSFile: {
                localFile: path.join(__dirname, "loader/css/loader.css"),
                publicFile: "css/loader.css"
            }
        })
    ].filter(e => !!e),
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/,
                loader: [
                    'style-loader',
                    /*
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            esModule: true,
                        },
                    },
                    */
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
                                        optimized: true,
                                        target_file: path.join(__dirname, "dist", "translations.json")
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
        filename: isDevelopment ? "[name].[contenthash].js" : "[contenthash].js",
        chunkFilename: isDevelopment ? "[name].[contenthash].js" : "[contenthash].js",
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