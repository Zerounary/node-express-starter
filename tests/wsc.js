const WebSocket = require("ws");

const url = "ws://localhost:90/ws/connect";

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
  let resp = JSON.parse(data);
  console.log("received: ", resp);
  if(resp.event == 'init') {
    send({
        event: 'query',
        clent_id: resp.data.client_id,
        sql: 'select sysdate from dual'
    })
  }
});
