const WebSocket = require('ws');
const axios = require('axios')
const https = require('https');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const privateKey = fs.readFileSync(process.env.APS_DOMAIN_PRIVATE_KEY);
const certificate = fs.readFileSync(process.env.APS_DOMAIN_CERTIFICATE);

const credentials = {
    key: privateKey,
    cert: certificate
};

const PORT = process.env.APS_PORT

const httpsServer = https.createServer(credentials);
httpsServer.listen(PORT);

const wss = new WebSocket.Server({server: httpsServer});
const API_URL = process.env.APS_API_URL

const AirealSPSType = {
    SERVER_INITIALIZED: 1,
    MESSAGE: 2
}

const config = {
    headers: {
        'X-API-KEY': process.env.APS_X_API_KEY,
        'X-API-SECRET': process.env.APS_X_API_SECRET,
        "Content-Type": "application/json",
    }
}

function setup(ws, serverSlug) {
    const formattedDate = new Date().toISOString();
    console.log('Connection Established');
    console.log('Issue Command for new Instance: ' + formattedDate)

    axios.post(`${API_URL}/api/matchmaker`, {application: serverSlug}, config)
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
            console.log(error.status);
            console.log(error.message);
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
    console.log('[' + formattedDate + '] Notify Aireal Streamer is connected')

    axios.post(`${API_URL}/api/server/ready`, message, config)
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
                if (error.response.status === 400) {
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

wss.on('listening', () => console.log('WebSocket server is running on port 9090'));
wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        console.log('received: %s', data);
        try {
            let message = JSON.parse(data)

            if (message.type === "streamerConnected") {
                // update db and remove ps_check_scheduler
                notifyAirealStreamerConnected(ws, message)
            }

            if (message.type === 'setupInstance') {
                setup(ws, message.server)
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
        deleteInstance(ws)
    })
});