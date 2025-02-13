const WebSocket = require("ws");
const { v4 } = require('uuid');
const uuid = v4;

const url = "ws://localhost:90/ws/connect";
let client_id = ''
const ws = new WebSocket(url, {
  perMessageDeflate: false,
});

const send = (data) => {
  ws.send(JSON.stringify(data));
};

ws.on("open", function open() {
  console.log(`${url} connected`);
  // setTimeout(() => {
  //     ws.close()
  // }, 5000)
});

ws.on("error", console.error);

ws.on("message", function message(data) {
  console.log("received: ", data.toString());
  let resp = JSON.parse(data);
  if(resp.event == 'init') {
    client_id = resp.data.client_id
    send({
        event: 'request',
        request_id: uuid(),
        client_id: uuid(),
        target_id: '1abad9f6-79b1-4862-9d6e-db0d5a542f61',
        api: "query",
        params: {
          sql: 'select sysdate from dual'
        }
    })
    // send({
    //     event: 'download',
    //     request_id: uuid(),
    //     client_id: resp.data.client_id,
    //     url: 'http://localhost:90/assets/upgrade_package.zip',
    // })
  } else if(resp.event == 'data') {
    console.log("received: ", resp);
  }
});
