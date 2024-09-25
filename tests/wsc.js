const WebSocket = require('ws')

const url = 'ws://localhost:90/ws/connect'

const ws = new WebSocket(url, {
  perMessageDeflate: false
});

const send = (data) => {
  ws.send(data)
}

ws.on('open', function open() {
    console.log(`${url} connected`);
    setTimeout(() => {
        ws.close()
    }, 5000)
})

ws.on('error', console.error);

ws.on('message', function message(data) {
  console.log('received: %s', data);
});