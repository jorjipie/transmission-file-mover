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
const consoleLogList = (list, all) => {
    let fields = list[0];
    for (let torrentIndex = 1; torrentIndex < list.length; torrentIndex++) {
        for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
            if (all) {
                if(fields[fieldIndex] == 'trackers') {
                    console.log(fields[fieldIndex] + "\t" + JSON.stringify(list[torrentIndex][fieldIndex]));
                }
                else {
                    console.log(fields[fieldIndex] + "\t" + list[torrentIndex][fieldIndex])
                }
            }
            else {
                switch(fields[fieldIndex]) {
                    case "id":
                        console.log("ID:\t:" + list[torrentIndex][fieldIndex]);
                        break;
                    case "downloadDir":
                        console.log("Download Dir:\t:" + list[torrentIndex][fieldIndex]);
                        break;
                    case "trackers":
                        console.log("Trackers:\t" + JSON.stringify(list[torrentIndex][fieldIndex]));
                        break;
                };  
            }
        }
        console.log("");
    }
};
const getTorrents = function (sessionID) {
    let requestData = {"arguments":{"fields":["id","error","errorString","eta","isFinished","isStalled","labels","leftUntilDone","metadataPercentComplete","peersConnected","peersGettingFromUs","peersSendingToUs","percentDone","queuePosition","rateDownload","rateUpload","recheckProgress","seedRatioMode","seedRatioLimit","sizeWhenDone","status","trackers","downloadDir","uploadedEver","uploadRatio","webseedsSendingToUs"],"format":"table",},"method":"torrent-get"};
    headers.headers["X-Transmission-Session-Id"] = sessionID;
    axios.post(config.transmission_server.url + 'rpc', requestData, headers)
    .catch(error => { console.log(error); })
    .then(res => { 
        //console.log(res.data.arguments.torrents[0]); 
        consoleLogList(res.data.arguments.torrents, true);
    });
}

getTransmissionSessionID();
