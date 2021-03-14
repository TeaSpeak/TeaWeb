export const downloadTextAsFile = (text: string, name: string) => {
    const payloadBlob = new Blob([ text ], { type: "text/plain" });
    const payloadUrl = URL.createObjectURL(payloadBlob);

    const element = document.createElement("a");
    element.text = "download";
    element.setAttribute("href", payloadUrl);
    element.setAttribute("download", name);
    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    setTimeout(() => {
        element.remove();
        URL.revokeObjectURL(payloadUrl);
    }, 0);
};

export const requestFileAsText = async (): Promise<string> => {
    const element = document.createElement("input");
    element.style.display = "none";
    element.type = "file";

    document.body.appendChild(element);
    element.click();
    await new Promise(resolve => {
        element.onchange = resolve;
    });

    if (element.files.length !== 1)
        return undefined;
    const file = element.files[0];
    element.remove();

    return await file.text();
};