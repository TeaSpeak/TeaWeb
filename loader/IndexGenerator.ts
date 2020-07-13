import * as path from "path";
import EJSGenerator = require("../webpack/EJSGenerator");

class IndexGenerator extends EJSGenerator {
    constructor(options: {
        buildTarget: string;
        output: string,
        isDevelopment: boolean
    }) {
        super({
            variables: {
                build_target: options.buildTarget
            },
            output: options.output,
            initialJSEntryChunk: "loader",
            input: path.join(__dirname, "html/index.html.ejs"),
            minify: !options.isDevelopment,

            embedInitialJSEntryChunk: !options.isDevelopment,
            embedInitialCSSFile: !options.isDevelopment,

            initialCSSFile: {
                localFile: path.join(__dirname, "css/index.css"),
                publicFile: "css/index.css"
            }
        });
    }

}

export = IndexGenerator;