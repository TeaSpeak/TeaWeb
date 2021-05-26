const escapeRegex = require('escape-string-regexp');
const path = require('path');
const slash = require('slash');
const sourceMapUrl = require('source-map-url');

function HtmlWebpackInlineSourcePlugin (htmlWebpackPlugin) {
    this.htmlWebpackPlugin = htmlWebpackPlugin;
}

HtmlWebpackInlineSourcePlugin.prototype.apply = function (compiler) {
    const self = this;

    // Hook into the html-webpack-plugin processing
    compiler.hooks.compilation.tap('html-webpack-inline-source-plugin', compilation => {
        self.htmlWebpackPlugin
            .getHooks(compilation)
            .alterAssetTagGroups.tapAsync('html-webpack-inline-source-plugin', (htmlPluginData, callback) => {
            if (!htmlPluginData.plugin.options.inlineSource) {
                return callback(null, htmlPluginData);
            }

            const regexStr = htmlPluginData.plugin.options.inlineSource;
            const result = self.processTags(compilation, regexStr, htmlPluginData);
            callback(null, result);
        });
    });
};

HtmlWebpackInlineSourcePlugin.prototype.processTags = function (compilation, regexStr, pluginData) {
    const self = this;

    const bodyTags = [];
    const headTags = [];

    const regex = new RegExp(regexStr);
    const filename = pluginData.plugin.options.filename;

    pluginData.headTags.forEach(function (tag) {
        headTags.push(self.processTag(compilation, regex, tag, filename));
    });

    pluginData.bodyTags.forEach(function (tag) {
        bodyTags.push(self.processTag(compilation, regex, tag, filename));
    });

    return { headTags: headTags, bodyTags: bodyTags, plugin: pluginData.plugin, outputName: pluginData.outputName };
};

HtmlWebpackInlineSourcePlugin.prototype.resolveSourceMaps = function (compilation, assetName, asset) {
    let source = asset.source();
    const out = compilation.outputOptions;
    // Get asset file absolute path
    const assetPath = path.join(out.path, assetName);
    // Extract original sourcemap URL from source string
    if (typeof source !== 'string') {
        source = source.toString();
    }
    const mapUrlOriginal = sourceMapUrl.getFrom(source);
    // Return unmodified source if map is unspecified, URL-encoded, or already relative to site root
    if (!mapUrlOriginal || mapUrlOriginal.indexOf('data:') === 0 || mapUrlOriginal.indexOf('/') === 0) {
        return source;
    }
    // Figure out sourcemap file path *relative to the asset file path*
    const assetDir = path.dirname(assetPath);
    const mapPath = path.join(assetDir, mapUrlOriginal);
    const mapPathRelative = path.relative(out.path, mapPath);
    // Starting with Node 6, `path` module throws on `undefined`
    const publicPath = out.publicPath || '';
    // Prepend Webpack public URL path to source map relative path
    // Calling `slash` converts Windows backslashes to forward slashes
    const mapUrlCorrected = slash(path.join(publicPath, mapPathRelative));
    // Regex: exact original sourcemap URL, possibly '*/' (for CSS), then EOF, ignoring whitespace
    const regex = new RegExp(escapeRegex(mapUrlOriginal) + '(\\s*(?:\\*/)?\\s*$)');
    // Replace sourcemap URL and (if necessary) preserve closing '*/' and whitespace
    return source.replace(regex, function (match, group) {
        return mapUrlCorrected + group;
    });
};

HtmlWebpackInlineSourcePlugin.prototype.processTag = function (compilation, regex, tag, filename) {
    let assetUrl;
    let preTag = tag;

    // inline js
    if (tag.tagName === 'script' && tag.attributes && regex.test(tag.attributes.src)) {
        assetUrl = tag.attributes.src;
        tag = {
            tagName: 'script',
            closeTag: true,
            attributes: {
                type: 'text/javascript'
            }
        };

        // inline css
    } else if (tag.tagName === 'link' && regex.test(tag.attributes.href)) {
        assetUrl = tag.attributes.href;
        tag = {
            tagName: 'style',
            closeTag: true,
            attributes: {
                type: 'text/css'
            }
        };
    }

    if (assetUrl) {
        // Strip public URL prefix from asset URL to get Webpack asset name
        const publicUrlPrefix = compilation.outputOptions.publicPath || '';
        // if filename is in subfolder, assetUrl should be prepended folder path
        if (path.basename(filename) !== filename) {
            assetUrl = path.dirname(filename) + '/' + assetUrl;
        }
        const assetName = path.posix.relative(publicUrlPrefix, assetUrl);
        const asset = getAssetByName(compilation.assets, assetName);
        if (compilation.assets[assetName] !== undefined) {
            const updatedSource = this.resolveSourceMaps(compilation, assetName, asset);
            tag.innerHTML = (tag.tagName === 'script') ? updatedSource.replace(/(<)(\/script>)/g, '\\x3C$2') : updatedSource;
        }else{
            return preTag;
        }
    }

    return tag;
};

function getAssetByName (assests, assetName) {
    for (let key in assests) {
        if (assests.hasOwnProperty(key)) {
            let processedKey = path.posix.relative('', key);
            if (processedKey === assetName) {
                return assests[key];
            }
        }
    }
}

export = HtmlWebpackInlineSourcePlugin;