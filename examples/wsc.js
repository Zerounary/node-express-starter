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
    // let target_id = "34230b42-ad9f-42de-8e7d-a5fdd0a179a2"; // BPM服务
    let target_id = "1abad9f6-79b1-4862-9d6e-db0d5a542f61"; // 开发环境
    // let target_id = '51898dc3-d000-4a33-b02b-668f910c8090';

    // download(target_id);
    // db_query(target_id);
    // query_apps(target_id);
    db_test(target_id)
  } else if (resp.event == "data") {
    console.log("received: ", resp);
  }
});
const db_test = (target_id) => {
  let request_id = uuid();
  send({
    request_id,
    target_id,
    api: "query",
    params: {
      sql: "select 1 from dual",
      db: 'bosnds3/abc123@app.burgeonerp.cn:22990/testorcl'
    },
  });
};

const db_query = (target_id) => {
  let request_id = uuid();
  send({
    request_id,
    target_id,
    api: "query",
    params: {
      sql: "select t.id,t.description, t.name, t.emp_name, t.store_sql, t.is_unsubmit, t.creationdate, t.c_store_filter from mb_users t where t.id = 161",
    },
  });
};

const db_import = (target_id) => {
  let request_id = uuid();
  send({
    request_id,
    target_id,
    api: "import",
    params: {
      opt: "bosnds3/abc123@app.burgeonerp.cn:22990/orclsxcs",
      sql: `
      SET SQLFORMAT JSON;

SPOOL ${request_id}.rst REPLACE;

select t.id,t.description, t.name, t.emp_name, t.store_sql, t.is_unsubmit, t.creationdate, t.c_store_filter from mb_users t where t.id = 161;


SPOOL OFF;

exit
      `,
      // sql: "select t.id,t.description, t.name, t.emp_name, t.store_sql, t.is_unsubmit, t.creationdate, t.c_store_filter from mb_users t where t.id = 161",
    },
  });
};

const dir_lookup = (target_id) => {
  send({
    target_id,
    api: "dir_lookup",
    params: {
      // dir 为空是 默认查看 apps下有哪些文件
      // dir: '.', // .表示相对路径, 如何 "./apps/image-compress"
      dir: "D:/",
    },
  });
};

const download = (target_id) => {
  send({
    target_id,
    api: "download",
    params: {
      // url: 'http://localhost:910/image-compress.zip',
      url: "http://localhost:910/sqlcl.zip",
      // extract_dir: "apps/sqlcl",
    },
  });
};

const install_app = (target_id) => {
  send({
    target_id,
    api: "install_app",
    params: {
      app_name: "image-compress",
    },
  });
};

const start_app = (target_id) => {
  send({
    target_id,
    api: "start_app",
    params: {
      app_name: "image-compress",
    },
  });
};

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

const query_apps = (target_id) => {
  send({
    target_id,
    api: "query_apps",
    params: {},
  });
};
