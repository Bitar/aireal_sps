const WebSocket = require('ws');
const axios = require('axios')

const wss = new WebSocket.Server({port: 9090});
let reconnectInterval = null;
const API_URL = 'https://staging.api.aireal.com'

const AirealSPSType = {
    SERVER_INITIALIZED: 1,
    MESSAGE: 2
}

function setup(ws) {
    const formattedDate = new Date().toISOString();
    console.log('Connection Established');
    console.log('Issue Command for new Instance: ' + formattedDate)

    axios.post(`${API_URL}/api/matchmaker`, null, {
        headers: {
            'Authorization': 'Bearer 3|JcGMTiTSQCGXOHJpCwgMpj0VtkUvQOO9JdSnRPD7df079fc4'
        }
    })
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
    axios.delete(`${API_URL}/api/matchmaker/${ws.server?.id}`, {
        headers: {
            'Authorization': 'Bearer 3|JcGMTiTSQCGXOHJpCwgMpj0VtkUvQOO9JdSnRPD7df079fc4'
        }
    })
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

wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        console.log('received: %s', data);
        try {
            let message = JSON.parse(data)

            if(message.type === 2 && message.action === 'setup') {
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