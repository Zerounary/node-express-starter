const WebSocket = require("ws");
const { v4 } = require("uuid");
const uuid = v4;

const url = "ws://localhost:90/ws/connect";
const ws = new WebSocket(url, {
  perMessageDeflate: false,
});

let client_id = uuid();

const send = (data) => {
  ws.send(
    JSON.stringify({
      event: "request",
      request_id: uuid(),
      client_id,
      ...data,
    })
  );
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
  if (resp.event == "init") {
    let target_id = "8cafa326-0c89-4885-b7b6-44b6365e1647"; // BPM服务
    // let target_id = '1abad9f6-79b1-4862-9d6e-db0d5a542f61'  // 开发环境
    // send({
    //     target_id: '1abad9f6-79b1-4862-9d6e-db0d5a542f61',
    //     api: "query",
    //     params: {
    //       sql: 'select sysdate from dual'
    //     }
    // })
    download(target_id)
  } else if (resp.event == "data") {
    console.log("received: ", resp);
  }
});

const download = (target_id) => {
  send({
    target_id,
    api: "download",
    params: {
        // url: 'http://localhost:910/image-compress.zip',
        url: 'http://localhost:910/config.zip',
        extract_dir: 'apps/image-compress',
    },
  });
}

const install_app = (target_id) => {
  send({
    target_id,
    api: "install_app",
    params: {
      app_name: "image-compress",
    },
  });
}

const start_app = (target_id) => {
  send({
    target_id,
    api: "start_app",
    params: {
      app_name: "image-compress",
    },
  });
}

const stop_app = (target_id) => {
  send({
    target_id,
    api: "stop_app",
    params: {
      app_name: "image-compress",
    },
  });
};

const uninstall_app = (target_id) => {
  send({
    target_id,
    api: "uninstall_app",
    params: {
      app_name: "image-compress",
    },
  });
};

const query_status = (target_id) => {
  send({
    target_id,
    api: "query_app_status",
    params: {
      app_name: "image-compress",
    },
  });
};
