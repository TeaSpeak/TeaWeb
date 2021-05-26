export const downloadUrl = (payloadUrl: string, name: string, cleanupCallback?: () => void) => {
    const element = document.createElement("a");
    element.text = "download";
    element.setAttribute("href", payloadUrl);
    element.setAttribute("download", name);
    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    setTimeout(() => {
        element.remove();
        if(cleanupCallback) {
            cleanupCallback();
        }
    }, 0);
}

export const downloadTextAsFile = (text: string, name: string) => {
    const payloadBlob = new Blob([ text ], { type: "text/plain" });
    const payloadUrl = URL.createObjectURL(payloadBlob);
    downloadUrl(payloadUrl, name, () => URL.revokeObjectURL(payloadUrl));
};

export const promptFile = async (options: {
    accept?: string,
    multiple?: boolean
}): Promise<File[]> => {
    const element = document.createElement("input");
    element.style.display = "none";
    element.type = "file";

    if(typeof options.accept === "string") {
        element.accept = options.accept;
    }

    if(typeof options.multiple === "string") {
        element.multiple = options.multiple;
    }

    document.body.appendChild(element);
    element.click();
    await new Promise(resolve => {
        element.onchange = resolve;
    });

    const result = [];
    for(let index = 0; index < element.files.length; index++) {
        result.push(element.files.item(index));
    }

    element.remove();
    return result;
}

export const requestFileAsText = async (): Promise<string> => {
    const files = await promptFile({ multiple: false });
    if(files.length !== 1) {
        return undefined;
    }

    /* FIXME: text() might not be available in Safari */
    return await files[0].text();
};