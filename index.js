import axios from "axios";
import yaml from "js-yaml";
import fs from "fs";


const config = yaml.load(fs.readFileSync("config.yaml", "utf8"));
//console.log(config);
//console.log(config.transmission_server.url);
let headers = { headers: { 'X-Transmission-Session-Id': null }};

const getTransmissionSessionID = transmissionServerURL => {
    axios.post(config.transmission_server.url + 'rpc')
    .catch(error => {
        getTorrents(error.response.headers['x-transmission-session-id']);
    });
}

const cleanUpList = (table) => {
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

const movePrivateTrackedTorrents = (torrents, configTrackers) => {
    torrents.forEach(torrent => {
        /*  
            if the torrent is tracked by one of the trackers in the config AND
            the downloadDir is the configured origin AND the torrent is done 
            downloading, move the file to the destination. 
        */
        configTrackers.forEach(configTracker => {
            if (torrent.trackers.some(tracker => 
                tracker.announce.indexOf(configTracker.server)) != -1
                && torrent.downloadDir == configTracker['origin_folder']
                && torrent.leftUntilDone == 0) {
                
                console.log(configTracker);
                console.log(torrent);
                console.log("needs to be moved to " 
                    + configTracker['dest_folder']);
                
                let requestData = { 
                    "arguments": {
                        "location": configTracker['dest_folder'],
                        "move": true,
                        "ids": [torrent.id]
                    },
                    "method": "torrent-set-location"
                };
                axios.post(config.transmission_server.url + 'rpc', 
                    requestData, headers).then(res => {
                        console.log(`${torrent.name} moved from ${torrent.downloadDir} to ${configTracker['origin_folder']}.`)
                    });
            }
            else {
                //console.log(torrent);
            }
        });
    });
}
const getTorrents = function (sessionID) {
    let requestData = {"arguments":{"fields":["name","id","error","errorString",
        "eta","isFinished","isStalled","labels","leftUntilDone",
        "metadataPercentComplete","peersConnected","peersGettingFromUs",
        "peersSendingToUs","percentDone","queuePosition","rateDownload",
        "rateUpload","recheckProgress","seedRatioMode","seedRatioLimit",
        "sizeWhenDone","status","trackers","downloadDir","uploadedEver",
        "uploadRatio","webseedsSendingToUs"],"format":"table",},
        "method":"torrent-get"};
    headers.headers["X-Transmission-Session-Id"] = sessionID;
    axios.post(config.transmission_server.url + 'rpc', requestData, headers)
    .catch(error => { console.log(error); })
    .then(res => { 
        //consoleLogList(res.data.arguments.torrents, true);
        let list = cleanUpList(res.data.arguments.torrents);
        movePrivateTrackedTorrents(list, config["private_trackers"]);
    });
}

getTransmissionSessionID();
