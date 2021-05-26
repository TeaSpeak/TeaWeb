import * as fs from "fs";
import * as util from "util";
import * as path from "path";
import * as child_process from "child_process";

import {GeneratedAssetPlugin} from "./webpack/GeneratedAssetPlugin";

import { DefinePlugin, Configuration, } from "webpack";

import { Plugin as SvgSpriteGenerator } from "webpack-svg-sprite-generator";
import ManifestGenerator from "./webpack/ManifestPlugin";
import HtmlWebpackInlineSourcePlugin from "./webpack/HtmlWebpackInlineSource";
import TranslateableWebpackPlugin from "./tools/trgen/webpack/Plugin";

import ZipWebpackPlugin from "zip-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

export let isDevelopment = process.env.NODE_ENV === 'development';
console.log("Webpacking for %s (%s)", isDevelopment ? "development" : "production", process.env.NODE_ENV || "NODE_ENV not specified");

interface LocalBuildInfo {
    target: "client" | "web",
    mode: "debug" | "release",

    gitVersion: string,
    gitTimestamp: number,

    unixTimestamp: number,
    localTimestamp: string
}

let localBuildInfo: LocalBuildInfo;
const generateLocalBuildInfo = async (target: string): Promise<LocalBuildInfo> => {
    let info: LocalBuildInfo = {} as any;

    info.target = target as any;
    info.mode = isDevelopment ? "debug" : "release";

    {
        const gitRevision = fs.readFileSync(path.join(__dirname, ".git", "HEAD")).toString();
        if(gitRevision.indexOf("/") === -1) {
            info.gitVersion = (gitRevision || "00000000").substr(0, 8);
        } else {
            info.gitVersion = fs.readFileSync(path.join(__dirname, ".git", gitRevision.substr(5).trim())).toString().substr(0, 8);
        }

        try {
            const { stdout } = await util.promisify(child_process.exec)("git show -s --format=%ct");
            info.gitTimestamp = parseInt(stdout.toString());
            if(isNaN(info.gitTimestamp)) {
                throw "failed to parse timestamp '" + stdout.toString() + "'";
            }
        } catch (error) {
            console.error("Failed to get commit timestamp: %o", error);
            throw "failed to get commit timestamp";
        }
    }

    info.unixTimestamp = Date.now();
    info.localTimestamp = new Date().toString();

    return info;
};

const generateDefinitions = async (target: string) => {
    return {
        "__build": {
            target: JSON.stringify(target),
            mode: JSON.stringify(isDevelopment ? "debug" : "release"),
            version: JSON.stringify(localBuildInfo.gitVersion),
            timestamp: localBuildInfo.gitTimestamp,
            entry_chunk_name: JSON.stringify("main-app")
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

export const config = async (env: any, target: "web" | "client"): Promise<Configuration & { devServer: any }> => {
    localBuildInfo = await generateLocalBuildInfo(target);

    const translateablePlugin = new TranslateableWebpackPlugin({ assetName: "translations.json" });

    return {
        entry: {
            "loader": "./loader/app/index.ts",
            "modal-external": "./shared/js/entry-points/ModalWindow.ts",
        },

        devtool: isDevelopment ? "inline-source-map" : "source-map",
        mode: isDevelopment ? "development" : "production",
        plugins: [
            new CleanWebpackPlugin(),

            new DefinePlugin(await generateDefinitions(target)),
            new GeneratedAssetPlugin({
                customFiles: [
                    {
                        assetName: "buildInfo.json",
                        content: JSON.stringify(localBuildInfo)
                    }
                ]
            }),
            new ManifestGenerator({
                outputFileName: "manifest.json",
                context: __dirname
            }),

            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.join(__dirname, "shared", "img"),
                        to: 'img',
                        globOptions: {
                            ignore: [
                                '**/client-icons/**',
                                //'**/style/**',
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
            new SvgSpriteGenerator({
                dtsOutputFolder: path.join(__dirname, "shared", "svg-sprites"),
                publicPath: "/",
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
                    },
                    "country-flags": {
                        folder: path.join(__dirname, "shared", "img", "country-flags"),
                        cssClassPrefix: "flag-",
                        cssOptions: [
                            {
                                scale: 1,
                                selector: ".flag_em",
                                unit: "em"
                            }
                        ],
                        dtsOptions: {
                            enumName: "CountryFlag",
                            classUnionName: "CountryFlagClass",
                            module: false
                        }
                    }
                }
            }),

            generateIndexPlugin(target),
            new HtmlWebpackInlineSourcePlugin(HtmlWebpackPlugin),

            translateablePlugin,
            //new BundleAnalyzerPlugin(),

            env.package ? new ZipWebpackPlugin({
                path: path.join(__dirname, "dist-package"),
                filename: `${target === "web" ? "TeaWeb" : "TeaClient"}-${isDevelopment ? "development" : "release"}-${localBuildInfo.gitVersion}.zip`,
            }) : undefined
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
                                    before: [ translateablePlugin.createTypeScriptTransformer(program) ]
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
                    use: [ translateablePlugin.createTemplateLoader() ],
                    type: "asset/source",
                },
                {
                    test: /ChangeLog\.md$/i,
                    type: "asset/source",
                },
                {
                    test: /\.svg$/,
                    use: [{
                        loader: '@svgr/webpack',
                        options: {
                            svgoConfig: {
                                plugins: {
                                    removeViewBox: false
                                }
                            }
                        }
                    }],
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
            fallback: {
                stream: "stream-browserify",
                crypto: "crypto-browserify",
                buffer: "buffer"
            }
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

            /* hot dosn't work because of our loader */
            hot: false,
            hotOnly: false,

            liveReload: false,
            inline: false,

            host: "0.0.0.0",
            https: process.env["serve_https"] === "1"
        },
    };
};