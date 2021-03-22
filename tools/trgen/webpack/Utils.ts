import {TranslationEntry} from "./Definitions";

export const deltaTranslations = (result: TranslationEntry[], fileName: string, processSpeed: number, newTranslations: TranslationEntry[]) => {
    let deletedTranslations = 0;
    for(let index = 0; index < result.length; index++) {
        if(result[index].filename === fileName) {
            result.splice(index, 1);
            index--;
            deletedTranslations++;
        }
    }

    result.push(...newTranslations);
    if(deletedTranslations === 0 && newTranslations.length === 0) {
        console.log("Processed %s (%dms). No translations found.", fileName, processSpeed);
    } else if(deletedTranslations === 0) {
        console.log("Processed %s (%dms). Found %d translations", fileName, processSpeed, newTranslations.length);
    } else if(newTranslations.length === 0) {
        console.log("Processed %s (%dms). %d translations deleted.", fileName, processSpeed, deletedTranslations);
    } else {
        console.log("Processed %s (%dms). Old translation count: %d New translation count: %d", fileName, processSpeed, deletedTranslations, newTranslations.length);
    }
}