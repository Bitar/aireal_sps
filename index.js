const WebSocket = require('ws');
const axios = require('axios')

const wss = new WebSocket.Server({port: 9090});
let reconnectInterval = null;

const AirealSPSType = {
    SERVER_INITIALIZED: 1,
    MESSAGE: 2
}

function setup(ws) {
    const formattedDate = new Date().toISOString();
    console.log('Connection Established');
    console.log('Issue Command for new Instance: ' + formattedDate)

    axios.post('http://api.aireal.test/api/matchmaker', null, {
        headers: {
            'Authorization': 'Bearer 4|0IIaZZBasQj8yMK22gInsrjp653qj1dLKziu9C5Sa6430814'
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
    axios.delete(`http://api.aireal.test/api/matchmaker/${ws.server?.id}`, {
        headers: {
            'Authorization': 'Bearer 4|0IIaZZBasQj8yMK22gInsrjp653qj1dLKziu9C5Sa6430814'
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

// const signallingWs = new WebSocket(`ws://54.201.119.85:8889`);
//
// signallingWs.on('open', function open() {
//     console.log('WebSocket connection established.');
// });
//
// signallingWs.on('message', function incoming(data) {
//     console.log('WebSocket message received: ', data);
// });
//
// signallingWs.on('close', function close() {
//     console.log('WebSocket connection closed.');
// });
//
// signallingWs.on('error', function error(err) {
//     console.log('WebSocket error: ', err);
// });

// signallingWs.on('connection', function connection(ws) {
//
//     console.log('connected');
//     ws.on('message', function message(data) {
//         console.log('received: %s', data);
//     });
// });

wss.on('connection', function connection(ws) {
    setup(ws)

    ws.on('message', function message(data) {
        console.log('received: %s', data);
        try {
            let message = JSON.parse(data)

            if (message.type === 1 && message.action === 'check_streamer_connected') {
                checkStreamerConnected(ws)
            }
        } catch (error) {
            console.log('Invalid Message received')
            console.log(data)
        }
    });
    ws.on('close', function message(data) {
        console.log('closed at: ' + new Date().toISOString())
        // deleteInstance(ws)
    })
});