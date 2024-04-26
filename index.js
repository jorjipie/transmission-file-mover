import axios from "axios";
import yaml from "js-yaml";
import fs from "fs";

const fileURL = new URL('./config.yaml', import.meta.url)
const config = yaml.load(fs.readFileSync(fileURL, "utf8"));
let headers = { headers: { 'X-Transmission-Session-Id': null }};

// polls Transmission instance for session ID. 
const getTransmissionSessionID = transmissionServerURL => {
    axios.post(config.transmission_server.url + 'rpc')
    .catch(error => {
        getTorrents(error.response.headers['x-transmission-session-id']);
    });
}

// converts table list to regular json array.
const cleanUpList = table => {
    const properties = table[0];
    let list = [];
    for (let tableIndex = 1; tableIndex < table.length; tableIndex++) {
        let listItem = {};
        for (let propIndex = 0; propIndex < properties.length; propIndex++) {
            listItem[properties[propIndex]] = table[tableIndex][propIndex];
        }
        list.push(listItem);
    }
    return list;
}

/*  returns the matching tracker if there is any.
    FWIW, I don't love nesting an if inside two for loops, but I really wanted
    that early exit. 
*/
const matchTrackers = (torrentTrackers, configTrackers) => {
    for (let ttIndex = 0; ttIndex < torrentTrackers.length; ttIndex++) {
        for (let ctIndex = 0; ctIndex < configTrackers.length; ctIndex++) {
            if (torrentTrackers[ttIndex].announce
                .indexOf(configTrackers[ctIndex].server) != -1) {
                return configTrackers[ctIndex];
            }
        }
    }
    return null;
}

// calls Transmission to move a single torrent to the destFolder
const moveTorrent = (torrent, destFolder) => {
    let requestData = { 
        "arguments": {
            "location": destFolder,
            "move": true,
            "ids": [torrent.id]
        },
        "method": "torrent-set-location"
    };
    axios.post(config.transmission_server.url + 'rpc', requestData, headers)
    .then(res => {
        consoleLog(`${torrent.name} moved from ${torrent.downloadDir} to `
        + `${destFolder}.`, "warn");
    });
}

const consoleLog = (message, logLevel) => {
    if (logLevel === "error") {
        console.log(message);
    } else if (logLevel === "warn"
        && (config["log_level"] === "warn" || config["log_level"] === "info")) {
        console.log(message);
    } else if (logLevel === "info" && config["log_level"] === "info") {
        console.log(message);
    }
    return;
}

/*  For a single torrent. 
    Checks if it's private. 
    If private, checks it against configured trackers. 
    If there's a tracker match, checks the destination folder to make sure that
        it's in the right place. If it's not, it moves it.
*/
const processPrivateTorrent = (torrent, configTrackers) => {
    let trackerMatch = matchTrackers(torrent.trackers, configTrackers);
    if (trackerMatch != null 
        && torrent.downloadDir === trackerMatch['dest_folder']) {
        consoleLog("\tTorrent is already in correct destination.", "info");
    
    } else if (torrent.downloadDir != trackerMatch['dest_folder']) { 
        moveTorrent(torrent, trackerMatch['dest_folder']);

    } else {
        consoleLog("No tracker match! Add this tracker to your config!\n" + torrent.trackers, "warn");
    }
};

const checkAndMoveTorrent = (torrent, configTrackers) => {
    if (torrent.isPrivate) {
        consoleLog (`${torrent.name} is private.`, "info");
        processPrivateTorrent(torrent, configTrackers);
    } else { 
        consoleLog (`${torrent.name} is not private.`, "error"); 
        throw new error("Not implemented yet!")
}
};

// Iterates through all torrents.
const processTorrents = (torrents, configTrackers) => {
    if (configTrackers == null) {
        throw new Error('No private tracker has been declared in the ' 
        + 'config.yaml. Refer to config.yaml.example for ... an example.'); }
    torrents.forEach(torrent => checkAndMoveTorrent(torrent, configTrackers));
};

// Polls transmission for all torrents. Processes them.
const getTorrents = function (sessionID) {
    let requestData = {"arguments":{"fields":["name", "isPrivate","id","error",
        "errorString","eta","isFinished","isStalled","labels","leftUntilDone",
        "metadataPercentComplete","peersConnected","peersGettingFromUs",
        "peersSendingToUs","percentDone","queuePosition","rateDownload",
        "rateUpload","recheckProgress","seedRatioMode","seedRatioLimit",
        "sizeWhenDone","status","trackers","downloadDir","uploadedEver",
        "uploadRatio","webseedsSendingToUs"],"format":"table"},
        "method":"torrent-get"};
    headers.headers["X-Transmission-Session-Id"] = sessionID;
    axios.post(config.transmission_server.url + 'rpc', requestData, headers)
    .catch(error => { consoleLog(error, "error"); })
    .then(res => { 
        //consoleLogList(res.data.arguments.torrents, true);
        let list = cleanUpList(res.data.arguments.torrents);
        processTorrents(list, config["private_trackers"]);
    });
};

getTransmissionSessionID();
