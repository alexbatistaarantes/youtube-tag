document.addEventListener("DOMContentLoaded", async () => {
    await init();
    initInterface();
});

////////////////////////////////////////////////////////////////////////////////////////
// CONTROL

// if current tab is a channel page
let isChannelPage = false;
// Data of the channel active, if current tab is a channel page
let activeChannel = {};

let tags = {};
let channels = {};

async function loadData(){
    const data = await browser.storage.local.get({'tags': {}, 'channels': {}});
    tags = data.tags;
    channels = data.channels;
}

async function saveData(){
    await browser.storage.local.set({tags, channels});
}

async function init(){
    await loadData();
    // Load tags data
    //tags = {
    //    "filosofia": ["Normose_", "PlasticPills"],
    //    "brasileiro": ["Normose_"]
    //};
    //// Load channels data
    //channels = {
    //    "PlasticPills": {user: 'PlasticPills', name: "Plastic Pills", url: "https://www.youtube.com/@PlasticPills", image: "https://yt3.ggpht.com/ytc/AOPolaRLbgkn_T3ownfjfgnzPNpx4iNk_k9DNQd4xo2N=s88-c-k-c0x00ffffff-no-rj"},
    //    "Normose_": {user: 'Normose_', name: "Normose", url: "https://www.youtube.com/@Normose_", image: "https://yt3.ggpht.com/IYhw8vOo4wlYg8_SGSnz4nbFXUnUrnig1xziAIYPuriIOKsmZgCgLnoQrjwVeb_0qjTubsyz=s88-c-k-c0x00ffffff-no-rj"},
    //};

    // If current tab is a channel page, save channels infos
    const tabs = await browser.tabs.query({currentWindow: true, active: true});
    const tab = tabs[0];
    if(/.*:\/\/.*youtube.com\/@.*/.test(tab.url)){
        // Just obtain the user for now
        activeChannel.user = tab.url.match(/.*:\/\/.*youtube.com\/@([\w\.-]*)/)[1];
        activeChannel.url = `https://www.youtube.com/@${activeChannel.user}`;
        
        isChannelPage = true;
    }
}

// Create new tag
async function newTag(name){
    if(! Object.keys(tags).includes(name.toLowerCase()) && name.trim() !== ""){
        tags[name.toLowerCase()] = [];
        await saveData();
    }
}
async function deleteTag(name){
    delete tags[name];
    await saveData();
}

// Add tag channel
async function tagChannel(tag, channel){
    // If channel not in list of channels yet, add
    if(! Object.keys(channels).includes(channel.user)){
        channels[channel.user] = channel;
    }

    tags[tag].push(channel.user);
    await saveData();
}
// Remove tag from channel
async function untagChannel(tag, channel){
    tags[tag] = tags[tag].filter((user) => user != channel.user);

    // If channel does not exist in any other tag, deletes it
    let keepChannel = false;
    for(let channels of Object.values(tags)){
        if(channels.includes(channel.user)){
            keepChannel = true;
            break;
        }
    }
    if(!keepChannel) delete channels[channel.user];

    await saveData();
}


////////////////////////////////////////////////////////////////////////////////////////
// INTERFACE

const newTagInput = document.querySelector("#new-tag > input");
const newTagButton = document.querySelector("#new-tag > button");

const searchVideoText = document.querySelector("#search-video input");
const searchVideoTag = document.querySelector("#search-video select");
const searchVideoButton = document.querySelector("#search-video button");

// Event to when button to new tag is clicked
newTagButton.addEventListener("click", () => handler('newTag', {tag: newTagInput.value}));
// Event to when button to search video is clicked
searchVideoButton.addEventListener("click",
    () => handler('searchVideo', {
        text: searchVideoText.value,
        tag: searchVideoTag.value
    })
);

// Return UL list of channels
function createChannelsList(tag){
    const list = document.createElement("ul");

    for(let href of tags[tag]){
        const channel = channels[href];

        // Create list item
        const listItem = document.createElement("li");
        listItem.classList.add("channel");
        // Add button to remove from tag
        const button = document.createElement("button");
        button.innerText = "-";
        button.addEventListener('click', () => handler('untag', {tag: tag, channel: channel}));
        listItem.appendChild(button);
        
        // Add image
        //const img = document.createElement("img");
        //img.setAttribute("src", channel.image);
        //listItem.appendChild(img);
        
        // Add link
        const link = document.createElement("span");
        link.classList.add("channel-link");
        // Event to open channel URL in new tab, since I can't figure it out how to use links in popup (guess you can't)
        link.innerText = channel.user;
        link.addEventListener('click', () => browser.tabs.create({url: channel.url}));
        listItem.appendChild(link);

        list.appendChild(listItem);
    }

    return list;
}

// Return UL list of tags and their channels
function createTagList(){
    const list = document.createElement("ul");

    for(const name of Object.keys(tags)){
        const channels = tags[name];

        // Create list item
        const listItem = document.createElement("li");

        // Add button to delete tag
        const deleteButton = document.createElement('button');
        deleteButton.innerText = '🗑️';
        // Defines what to call when button clicked
        deleteButton.addEventListener('click', () => handler('deleteTag', {tag: name}));
        listItem.appendChild(deleteButton);

        // Add button to add or remove tag from channel, if in channel page
        if(isChannelPage){
            
            let text = "+";
            let action = 'tag';
            if(channels.includes(activeChannel.user)){
                text = "-";
                action = 'untag';
            }
            
            const itemButton = document.createElement('button');
            itemButton.innerText = text;
            // Defines what to call when button clicked
            itemButton.addEventListener('click', () => handler(action, {tag: name, channel: activeChannel}));

            listItem.appendChild(itemButton);
        }

        // Add tag name
        const title = document.createElement("span");
        title.innerText = name;
        listItem.appendChild(title);
        // Add list of channels
        const listOfChannels = createChannelsList(name);
        listItem.appendChild(listOfChannels);

        list.appendChild(listItem);
    }

    return list;
}

function fillTagSelect(){
    searchVideoTag.innerHTML = "";
    for(let tag of Object.keys(tags)){
        const option = document.createElement("option");
        option.innerText = tag;
        option.value = tag;

        searchVideoTag.appendChild(option);
    }
}

function searchVideo(text, tag){
    const query = `site:youtube.com/watch ${text} ${tags[tag].join(" OR ")}`;
    const url = `https://www.google.com/search?q=${query}`;
    browser.tabs.create({url: url});
}

// Handle actions triggered by the interface
function handler(action, data={}){
    const actions = {
        'tag': () => tagChannel(data.tag, data.channel),
        'untag': () => untagChannel(data.tag, data.channel),
        'newTag': () => newTag(data.tag),
        'deleteTag': () => deleteTag(data.tag),
        'searchVideo': () => searchVideo(data.text, data.tag)
    }
    actions[action]();

    // Refresh interface
    initInterface();
}

function initTagList(){
    const tagsDiv = document.querySelector("#tags");
    tagsDiv.innerHTML = "";

    tagsList = createTagList();
    tagsDiv.appendChild(tagsList);
}

function initInterface(){
    initTagList();
    fillTagSelect();
}
