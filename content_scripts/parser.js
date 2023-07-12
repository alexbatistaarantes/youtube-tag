// Wait for element, from selector, to exist and then returns it 
// https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
async function getElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// Returns information of channel
async function parseChannel(){

    const nameElement = await getElement("ytd-channel-name yt-formatted-string#text");
    const imageElement = await getElement("#avatar > img");

    const name = nameElement.innerText;
    const image = imageElement.src;

    return {name: name, image: image};
}
