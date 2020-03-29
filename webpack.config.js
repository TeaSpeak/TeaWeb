const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isDevelopment = process.env.NODE_ENV === 'development';
module.exports = {
    entry: './shared/js/main.ts',
    devtool: 'inline-source-map',
    mode: "development",
    plugins: [
        new MiniCssExtractPlugin({
            filename: isDevelopment ? '[name].css' : '[name].[hash].css',
            chunkFilename: isDevelopment ? '[id].css' : '[id].[hash].css'
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
                            //transpileOnly: true
                        }
                    }
                ]
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', ".scss"],
        alias: {
            "tc-shared": path.resolve(__dirname, "shared/js"),
            "tc-backend": path.resolve(__dirname, "web/js")
        }
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    optimization: {
        /*
        splitChunks: {
            chunks: 'async',
            minSize: 1,
            maxSize: 500000,
            minChunks: 1,
            maxAsyncRequests: 6,
            maxInitialRequests: 4,
            automaticNameDelimiter: '~',
            automaticNameMaxLength: 30,
            cacheGroups: {
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true
                }
            }
        }
         */
    }
};