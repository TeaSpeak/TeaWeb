export interface YesNoParameters {
    title: string,
    question: string,

    textYes?: string,
    textNo?: string,

    closeable?: boolean
}

export async function promptYesNo(properties: YesNoParameters) : Promise<boolean | undefined> {
    /* Having these checks because tra(..) still might return jQuery */
    if(typeof properties.title !== "string") {
        debugger;
        throw "yes-no title isn't a string";
    }

    if(typeof properties.question !== "string") {
        debugger;
        throw "yes-no question isn't a string";
    }

    return false;
}