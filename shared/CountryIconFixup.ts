/* Country icons from https://www.flaticon.com/packs/rectangular-country-simple-flags?word=country&k=1616497480370 */
/* Worldwide: https://www.flaticon.com/free-icon/worldwide_814513?term=earth%20flag&page=1&position=1&page=1&position=1&related_id=814513&origin=search */

import * as path from "path";
import * as fs from "fs-extra";
import {getKnownCountries} from "./js/i18n/country";

const kIconsPath = path.join(__dirname, "img", "country-flags");

async function fixupAdobeTags() {
    const icons = await fs.readdir(kIconsPath);
    for(const icon of icons) {
        const iconPath = path.join(kIconsPath, icon);

        console.error("Icon: %s", icon);
        let content = (await fs.readFile(iconPath)).toString();
        content = content.replace(/<g>\n<\/g>\n/g, "");
        content = content.replace("\n<!-- Generator: Adobe Illustrator 19.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->", "");
        content = content.replace("id=\"Capa_1\" ", "");
        content = content.replace("encoding=\"iso-8859-1\"", "encoding=\"utf-8\"");
        await fs.writeFile(iconPath, content);
    }
}

async function fixupIconNames() {
    const icons = await fs.readdir(kIconsPath);
    for(const icon of icons) {
        if(!icon.match(/^[0-9]{3}-/)) {
            continue;
        }

        let newName = icon.substring(4).replace(/-/g, "_");
        await fs.rename(path.join(kIconsPath, icon), path.join(kIconsPath, newName));
    }
}

async function generateMapping() {
    const icons = await fs.readdir(kIconsPath);
    const knownCountries = getKnownCountries();

    let countFound = 0, countUnknown = 0;
    for(const country of knownCountries) {
        let name = country.name;
        const splitIndex = name.indexOf(",");
        if(splitIndex !== -1) {
            name = name.substring(splitIndex + 2) + " " + name.substring(0, splitIndex);
        }

        let iconName = name.replace(/ /g, "_").toLocaleLowerCase() + ".svg";

        console.log("array.push({");
        console.log("name: \"%s\",", country.name);
        console.log("alpha_2: \"%s\",", country.alpha_2);
        console.log("alpha_3: \"%s\",", country.alpha_3);
        console.log("un_code: %d,", country.un_code);
        if(icons.indexOf(iconName) === -1) {
            iconName = undefined;
            console.log("icon: \"%s\", // FIXME: Resolve icons or remove", "worldwide");
            countUnknown++;
        } else {
            console.log("icon: \"%s\",", iconName.replace(".svg", "").replace(/_/g, "-"));
            countFound++;
        }
        console.log("});");
    }

    /*
    array.push({
        name: "Netherlands",
        alpha_2: "NL",
        alpha_3: "NLD",
        un_code: 528
    });
     */

    console.log("Icons resolved %d. Unresolved %d.", countFound, countUnknown);
}

async function main() {
    //await fixupAdobeTags();
    //await fixupIconNames();
    await generateMapping();
}
main().then(undefined);