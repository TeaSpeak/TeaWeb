import * as path from "path";
import * as fs from "fs-extra";


async function processFile(file: string) {

}

async function processDirectory(directory: string) {
    const files = await fs.readdir(directory);
    for(const file of files) {
        console.log(file);
    }
}

processDirectory(path.join(__dirname, "js")).catch(error => {
    console.error(error);
});