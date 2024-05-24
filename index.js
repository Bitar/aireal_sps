const WebSocket = require('ws');
const axios = require('axios')

const wss = new WebSocket.Server({port: 9090});
let reconnectInterval = null;
const API_URL = 'https://staging.api.aireal.com'
// const API_URL = 'http://api.aireal.test'

const AirealSPSType = {
    SERVER_INITIALIZED: 1,
    MESSAGE: 2
}

const config = {
    headers: {
        'Authorization': 'Bearer 3|JcGMTiTSQCGXOHJpCwgMpj0VtkUvQOO9JdSnRPD7df079fc4',
        // 'Authorization': 'Bearer 6|quoKgJlfiWktd4SfKFCUGTrMceosyA3CX3KuKew4552ac644',
        "Content-Type": "application/json",
    }
}

function setup(ws) {
    const formattedDate = new Date().toISOString();
    console.log('Connection Established');
    console.log('Issue Command for new Instance: ' + formattedDate)

    axios.post(`${API_URL}/api/matchmaker`, null, config)
        .then(response => {
            // handle success
            const data = response.data

            data.asps = {
                type: AirealSPSType.SERVER_INITIALIZED,
                message: 'Instance Initializing'
            }

            ws.server = data.data
            console.log(ws.server)

            ws.send(JSON.stringify(data))
        })
        .catch(error => {
            // handle error
            console.error(error);
        });
}

function deleteInstance(ws) {
    axios.delete(`${API_URL}/api/matchmaker/${ws.server?.id}`, config)
        .then(response => {
            // handle success
            console.log('Server: ' + ws.server?.name + ' - ID: ' + ws.server?.id + ' has been terminated!')
        })
        .catch(error => {
            // handle error
            console.error(error);
        });
}

function checkStreamerConnected(ws) {
    // const signallingWs = new WebSocket.Server({port: 80})
    const signallingWs = new WebSocket(`ws://${ws.server?.ce_public_ip}:80`);

    signallingWs.on('connection', function connection(ws) {

        console.log('connected');
        ws.on('message', function message(data) {
            console.log('received: %s', data);
        });
    });

}

function notifyAirealStreamerConnected(ws, message) {
    const formattedDate = new Date().toISOString();
    console.log('[' + formattedDate +  '] Notify Aireal Streamer is connected')

    axios.post(`${API_URL}/api/server/ready`, message,config)
        .then(response => {
            // handle success
            console.log('Aireal Notified')
        })
        .catch(error => {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                // console.log(error.response.data);
                // console.log(error.response.status);
                // console.log(error.response.headers);
                if(error.response.status === 400) {
                    console.log('Server Instance doesnt belong to any of our servers. This should be terminated directly')
                }
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', error.message);
            }
            // console.log(error.config);
        });
}

wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        console.log('received: %s', data);
        try {
            let message = JSON.parse(data)

            if(message.type === "streamerConnected") {
                // update db and remove ps_check_scheduler
                notifyAirealStreamerConnected(ws, message)
            }

            if(message.type === 'setupInstance') {
                setup(ws)
            }

            if (message.type === 1 && message.action === 'check_streamer_connected') {
                checkStreamerConnected(ws)
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    });
    ws.on('close', function message(data) {
        console.log('closed at: ' + new Date().toISOString())
        // deleteInstance(ws)
    })
});