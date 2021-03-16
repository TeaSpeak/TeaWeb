import * as ts from "typescript";
import * as fs from "fs";
import trtransformer from "./tools/trgen/ts_transformer";
import {exec} from "child_process";
import * as util from "util";
import { Plugin as SvgSpriteGenerator } from "webpack-svg-sprite-generator";

import LoaderIndexGenerator from "./loader/IndexGenerator";
import {Configuration} from "webpack";

const path = require('path');
const webpack = require("webpack");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ManifestGenerator = require("./webpack/ManifestPlugin");
const WorkerPlugin = require('worker-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

export let isDevelopment = process.env.NODE_ENV === 'development';
console.log("Webpacking for %s (%s)", isDevelopment ? "development" : "production", process.env.NODE_ENV || "NODE_ENV not specified");
const generateDefinitions = async (target: string) => {
    const git_rev = fs.readFileSync(path.join(__dirname, ".git", "HEAD")).toString();
    let version;
    if(git_rev.indexOf("/") === -1)
        version = (git_rev || "0000000").substr(0, 7);
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

const isLoaderFile = (file: string) => {
    if(file.startsWith(__dirname)) {
        const path = file.substr(__dirname.length).replace(/\\/g, "/");
        if(path.startsWith("/loader/")) {
            return true;
        }
    }
    return false;
};

export const config = async (target: "web" | "client"): Promise<Configuration> => { return {
    entry: {
        "loader": "./loader/app/index.ts",
        "modal-external": "./shared/js/ui/react-elements/external-modal/PopoutEntrypoint.ts",
        "devel-main": "./shared/js/devel_main.ts"
    },

    devtool: isDevelopment ? "inline-source-map" : undefined,
    mode: isDevelopment ? "development" : "production",
    plugins: [
        //new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: isDevelopment ? '[name].css' : '[name].[hash].css',
            chunkFilename: isDevelopment ? '[id].css' : '[id].[hash].css'
        }),
        new ManifestGenerator({
            file: path.join(__dirname, "dist/manifest.json"),
            base: __dirname
        }),
        new WorkerPlugin(),
        //new BundleAnalyzerPlugin(),
        isDevelopment ? undefined : new webpack.optimize.AggressiveSplittingPlugin({
            minSize: 1024 * 8,
            maxSize: 1024 * 128
        }),
        new webpack.DefinePlugin(await generateDefinitions(target)),
        new SvgSpriteGenerator({
            dtsOutputFolder: path.join(__dirname, "shared", "svg-sprites"),
            configurations: {
                "client-icons": {
                    folder: path.join(__dirname, "shared", "img", "client-icons"),
                    cssClassPrefix: "client-",
                    cssOptions: [
                        {
                            scale: 1,
                            selector: ".icon",
                            unit: "px"
                        },
                        {
                            scale: 1.5,
                            selector: ".icon_x24",
                            unit: "px"
                        },
                        {
                            scale: 2,
                            selector: ".icon_x32",
                            unit: "px"
                        },
                        {
                            scale: 1,
                            selector: ".icon_em",
                            unit: "em"
                        }
                    ],
                    dtsOptions: {
                        enumName: "ClientIcon",
                        classUnionName: "ClientIconClass",
                        module: false
                    }
                }
            }
        }),
        new LoaderIndexGenerator({
            buildTarget: target,
            output: path.join(__dirname, "dist/index.html"),
            isDevelopment: isDevelopment
        })
    ].filter(e => !!e),

    module: {
        rules: [
            {
                test: /\.(s[ac]|c)ss$/,
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
                            modules: {
                                mode: "local",
                                localIdentName: isDevelopment ? "[path][name]__[local]--[hash:base64:5]" : "[hash:base64]",
                            },
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
                test: (module: string) => module.match(/\.tsx?$/) && !isLoaderFile(module),
                exclude: /node_modules/,

                loader: [
                    {
                        loader: 'ts-loader',
                        options: {
                            context: __dirname,
                            colors: true,
                            getCustomTransformers: (prog: ts.Program) => {
                                return {
                                    before: [trtransformer(prog, {
                                        optimized: false,
                                        verbose: true,
                                        target_file: path.join(__dirname, "dist", "translations.json")
                                    })]
                                };
                            },
                            transpileOnly: isDevelopment
                        }
                    },
                    {
                        loader: "./webpack/DevelBlocks.js",
                        options: {
                            enabled: true
                        }
                    }
                ]
            },
            {
                test: (module: string) => module.match(/\.tsx?$/) && isLoaderFile(module),
                exclude: /(node_modules|bower_components)/,

                loader: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ["@babel/preset-env"]  //Preset used for env setup
                        }
                    },
                    {
                        loader: "ts-loader",
                        options: {
                            transpileOnly: true
                        }
                    }
                ]
            },
            {
                test: /\.was?t$/,
                loader: [
                    "./webpack/WatLoader.js"
                ]
            },
            {
                test: /\.svg$/,
                loader: 'svg-inline-loader'
            },
            {
                test: /ChangeLog\.md$/i,
                loader: "raw-loader",
                options: {
                    esModule: false
                }
            },
            {
                test: /\.(png|jpg|jpeg|gif)?$/,
                loader: 'file-loader',
            },
        ]
    } as any,
    resolve: {
        extensions: ['.tsx', '.ts', '.js', ".scss", ".css", ".wasm"],
        alias: {
            "vendor/xbbcode": path.resolve(__dirname, "vendor/xbbcode/src"),
            "tc-events": path.resolve(__dirname, "vendor/TeaEventBus/src/index.ts"),
            "tc-services": path.resolve(__dirname, "vendor/TeaClientServices/src/index.ts"),
        },
    },
    externals: [
        {"tc-loader": "window loader"}
    ],
    output: {
        filename: isDevelopment ? "[name].[contenthash].js" : "[contenthash].js",
        chunkFilename: isDevelopment ? "[name].[contenthash].js" : "[contenthash].js",
        path: path.resolve(__dirname, 'dist'),
        publicPath: "js/"
    },
    performance: {
        hints: false
    },
    optimization: {
        splitChunks: {
            chunks: "all"
        },
        minimize: !isDevelopment,
        minimizer: [new TerserPlugin()]
    }
}};