const WebSocket = require("ws");

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
        event: 'query',
        client_id: resp.data.client_id,
        customer: 'customer_test',
        sql: 'select sysdate from dual'
    })
  } else if(resp.event == 'data') {
    console.log("received: ", resp);
  }
});
