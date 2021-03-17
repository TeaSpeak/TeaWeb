import * as fs from "fs";
import * as util from "util";
import * as path from "path";
import * as child_process from "child_process";

import { DefinePlugin, Configuration, } from "webpack";

import { Plugin as SvgSpriteGenerator } from "webpack-svg-sprite-generator";
const ManifestGenerator = require("./webpack/ManifestPlugin");
const HtmlWebpackInlineSourcePlugin = require("./webpack/HtmlWebpackInlineSource");

import HtmlWebpackPlugin from "html-webpack-plugin";
import {TranslateableWebpackPlugin} from "./tools/trgen/WebpackPlugin";
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

export let isDevelopment = process.env.NODE_ENV === 'development';
console.log("Webpacking for %s (%s)", isDevelopment ? "development" : "production", process.env.NODE_ENV || "NODE_ENV not specified");

const generateDefinitions = async (target: string) => {
    const gitRevision = fs.readFileSync(path.join(__dirname, ".git", "HEAD")).toString();
    let version;
    if(gitRevision.indexOf("/") === -1) {
        version = (gitRevision || "0000000").substr(0, 7);
    } else {
        version = fs.readFileSync(path.join(__dirname, ".git", gitRevision.substr(5).trim())).toString().substr(0, 7);
    }

    let timestamp;
    try {
        const { stdout } = await util.promisify(child_process.exec)("git show -s --format=%ct");
        timestamp = parseInt(stdout.toString());
        if(isNaN(timestamp)) {
            throw "failed to parse timestamp '" + stdout.toString() + "'";
        }
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

const generateIndexPlugin = (target: "web" | "client"): HtmlWebpackPlugin => {
    const options: HtmlWebpackPlugin.Options & { inlineSource?: RegExp | string } = {};

    options.cache = true;
    options.chunks = ["loader"];
    options.inject = false;
    options.template = path.join(__dirname, "loader", "index.ejs");
    options.templateParameters = { buildTarget: target };
    options.scriptLoading = "defer";

    if(!isDevelopment) {
        options.minify = {
            html5: true,

            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeTagWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            minifyURLs: true,
        };

        options.inlineSource = /\.(js|css)$/;
    }
    return new HtmlWebpackPlugin(options);
}

export const config = async (target: "web" | "client"): Promise<Configuration & { devServer: any }> => {
    const translateablePlugin = new TranslateableWebpackPlugin({ assetName: "translations.json" });

    return {
        entry: {
            "loader": "./loader/app/index.ts",
            "modal-external": "./shared/js/ui/react-elements/external-modal/PopoutEntrypoint.ts",
            //"devel-main": "./shared/js/devel_main.ts"
        },

        devtool: isDevelopment ? "inline-source-map" : "source-map",
        mode: isDevelopment ? "development" : "production",
        plugins: [
            new CleanWebpackPlugin(),
            new DefinePlugin(await generateDefinitions(target)),

            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.join(__dirname, "shared", "img"),
                        to: 'img',
                        globOptions: {
                            ignore: [
                                '**/client-icons/**',
                            ]
                        }
                    },
                    target === "web" ? { from: path.join(__dirname, "shared", "i18n"), to: 'i18n' } : undefined,
                    { from: path.join(__dirname, "shared", "audio"), to: 'audio' }
                ].filter(e => !!e)
            }),

            new MiniCssExtractPlugin({
                filename: isDevelopment ? "css/[name].[contenthash].css" : "css/[contenthash].css",
                chunkFilename: isDevelopment ? "css/[name].[contenthash].css" : "css/[contenthash].css",
                ignoreOrder: true,

            }),

            new ManifestGenerator({
                outputFileName: "manifest.json",
                context: __dirname
            }),
            new SvgSpriteGenerator({
                dtsOutputFolder: path.join(__dirname, "shared", "svg-sprites"),
                publicPath: "/assets/",
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

            generateIndexPlugin(target),
            new HtmlWebpackInlineSourcePlugin(HtmlWebpackPlugin),

            translateablePlugin,
            //new BundleAnalyzerPlugin(),
        ].filter(e => !!e),

        module: {
            rules: [
                {
                    test: /\.(s[ac]|c)ss$/,
                    use: [
                        //'style-loader',
                        {
                            loader: MiniCssExtractPlugin.loader,
                            options: {
                                esModule: false,
                            }
                        },
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
                            loader: "postcss-loader"
                        },
                        {
                            loader: "sass-loader",
                            options: {
                                sourceMap: isDevelopment
                            }
                        }
                    ]
                },
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,

                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                presets: ["@babel/preset-env"]
                            }
                        },
                        {
                            loader: "ts-loader",
                            options: {
                                context: __dirname,
                                colors: true,
                                getCustomTransformers: program => ({
                                    before: [translateablePlugin.createTypeScriptTransformer(program)]
                                }),
                                transpileOnly: isDevelopment
                            }
                        }
                    ]
                },
                {
                    test: /\.was?t$/,
                    use: [
                        "./webpack/WatLoader.js"
                    ]
                },
                {
                    test: /\.html$/i,
                    use: [translateablePlugin.createTemplateLoader()],
                    type: "asset/source",
                },
                {
                    test: /ChangeLog\.md$/i,
                    type: "asset/source",
                },
                {
                    test: /\.svg$/,
                    use: 'svg-inline-loader'
                },
                {
                    test: /\.(png|jpg|jpeg|gif)?$/,
                    type: "asset/resource",
                    generator: {
                        filename: 'img/[hash][ext][query]'
                    }
                },
            ]
        } as any,
        resolve: {
            extensions: ['.tsx', '.ts', '.js', ".scss"],
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
            filename: isDevelopment ? "js/[name].[contenthash].js" : "js/[contenthash].js",
            chunkFilename: isDevelopment ? "js/[name].[contenthash].js" : "js/[contenthash].js",
            path: path.resolve(__dirname, "dist"),
            publicPath: "/"
        },
        performance: {
            hints: false
        },
        optimization: {
            splitChunks: {
                chunks: "all",
                maxSize: 512 * 1024
            },
            minimize: !isDevelopment,
            minimizer: [
                new TerserPlugin(),
                new CssMinimizerPlugin()
            ]
        },
        devServer: {
            publicPath: "/",
            contentBase: path.join(__dirname, 'dist'),
            writeToDisk: true,
            compress: true,
            hot: false,
            inline: false,
            liveReload: false,
        },
    };
};