const WebSocket = require("ws");
const { v4 } = require('uuid');
const uuid = v4;

const url = "ws://localhost:90/ws/connect";
const ws = new WebSocket(url, {
  perMessageDeflate: false,
});

let client_id = uuid()

const send = (data) => {
  ws.send(JSON.stringify({
    event: 'request',
    request_id: uuid(),
    client_id,
    ...data
  }));
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
    // let target_id = '8cafa326-0c89-4885-b7b6-44b6365e1647'
    let target_id = '1abad9f6-79b1-4862-9d6e-db0d5a542f61'
    // send({
    //     target_id: '1abad9f6-79b1-4862-9d6e-db0d5a542f61',
    //     api: "query",
    //     params: {
    //       sql: 'select sysdate from dual'
    //     }
    // })
    send({
        target_id,
        api: "download",
        params: {
          // url: 'http://localhost:910/image-compress.zip',
          url: 'http://localhost:910/config.zip',
          // app_name: 'apps/image-compress',
        }
    })
    // send({
    //     target_id: '1abad9f6-79b1-4862-9d6e-db0d5a542f61',
    //     api: "install_app",
    //     params: {
    //       app_name: 'image-compress',
    //     }
    // })
    // send({
    //     target_id: '1abad9f6-79b1-4862-9d6e-db0d5a542f61',
    //     api: "start_app",
    //     params: {
    //       app_name: 'image-compress',
    //     }
    // })
    // send({
    //     target_id: '1abad9f6-79b1-4862-9d6e-db0d5a542f61',
    //     api: "stop_app",
    //     params: {
    //       app_name: 'image-compress',
    //     }
    // })
    // send({
    //     target_id: '1abad9f6-79b1-4862-9d6e-db0d5a542f61',
    //     api: "uninstall_app",
    //     params: {
    //       app_name: 'image-compress',
    //     }
    // })
    // target_id = '1abad9f6-79b1-4862-9d6e-db0d5a542f61'
    // send({
    //     target_id,
    //     api: "query_app_status",
    //     params: {
    //       app_name: 'image-compress',
    //     }
    // })
  } else if(resp.event == 'data') {
    console.log("received: ", resp);
  }
});
