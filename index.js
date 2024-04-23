import axios from "axios";
import yaml from "js-yaml";
import fs from "fs";


const config = yaml.load(fs.readFileSync("config.yaml", "utf8"));
console.log(config.transmission_server.url);
let headers = { headers: { 'X-Transmission-Session-Id': null }};

const getTransmissionSessionID = transmissionServerURL => {
    axios.post(config.transmission_server.url + 'rpc')
    .catch(error => {
        getTorrents(error.response.headers['x-transmission-session-id']);
    });
}
const consoleLogList = (list) => {
    let headerRow = list[0];
    for (let i = 1; i < headerRow.length; i++) {
        console.log(headerRow[i] + "\t" + list[1][i])
    }
};
const getTorrents = function (sessionID) {
    let requestData = {"arguments":{"fields":["id","error","errorString","eta","isFinished","isStalled","labels","leftUntilDone","metadataPercentComplete","peersConnected","peersGettingFromUs","peersSendingToUs","percentDone","queuePosition","rateDownload","rateUpload","recheckProgress","seedRatioMode","seedRatioLimit","sizeWhenDone","status","trackers","downloadDir","uploadedEver","uploadRatio","webseedsSendingToUs"],"format":"table",},"method":"torrent-get"};
    headers.headers["X-Transmission-Session-Id"] = sessionID;
    axios.post(config.transmission_server.url + 'rpc', requestData, headers)
    .catch(error => { console.log(error); })
    .then(res => { 
        console.log(res.data.arguments.torrents[0]); 
        consoleLogList(res.data.arguments.torrents);
    });
}

getTransmissionSessionID();
