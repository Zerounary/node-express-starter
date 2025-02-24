import { decode, send } from "@/utils/protocol";
import logger from "@/logger";
import oracledb from "oracledb";
import { v4 as uuid } from "uuid";
import Client from "@/db/models/client";
import { where } from "sequelize";

let clients = new Map();
let requests = new Map();

// const queryLocalDB = async (client, params) => {
//   let client_id = params.client_id;
//   if (pool[client_id]) {
//     let db = pool[client_id];
//     const res = await db.execute(params.sql);
//     let columns = res.metaData.map((meta) => ({
//       name: meta.name,
//       ty: meta.dbTypeName,
//       nullable: meta.nullable,
//     }));

//     send(client, {
//       columns,
//       rows: res.rows,
//     });
//   } else {
//     logger.info("没有客户端");
//   }
// };

const sendToClient = async (event, params) => {
  let client_id = params.client_id;
  let request_id = params.request_id;
  let target_id = params.target_id;
  console.log("客户的链接id", target_id);
  let target_client = clients.get(target_id);
  if (target_client) {
    send(target_client, {
      event: "query",
      data: {
        request_id,
        sql: params.sql,
      },
    });
    // 记录hash结果
    requests[`${target_id}:${params.request_id}`] = {
      client_id,
      data: null,
    };
  } else {
    logger.info(`no client with id = ${target_id}`);
  }
};
const request = async (client, params) => {
  let client_id = client.id;
  let request_id = params.request_id;
  let target_id = params.target_id;
  let target_client = clients.get(target_id);
  console.log("客户的链接id", target_id);
  if (target_client) {
    let key = `${target_id}:${params.request_id}`;
    send(target_client, {
      event: params.api,
      data: {
        request_id,
        ...(params?.params || {}),
      },
    });
    // 记录hash结果
    requests.set(key, {
      client_id,
      data: null,
    });
  } else {
    logger.info(`when request, no client with id = ${target_id}`);
    send(client, {
      event: response,
      data: {
        request_id,
        error: "no client with id = " + target_id,
      },
    });
  }
};

const response = async (client, params) => {
  let client_id = client.id;
  console.log("params", params);
  console.log("requests", requests);
  let key = `${client_id}:${params.request_id}`;
  let target_id = requests.get(key)?.client_id;
  logger.info("data target_id = ", target_id);
  let target_client = clients.get(target_id);
  if (target_client) {
    logger.info(`remove key = ${key}`);
    requests.delete(key);
    send(target_client, {
      event: "response",
      data: {
        request_id: params.request_id,
        ...(params.data || {}),
      },
    });
  } else {
    logger.info(`when response, no client with id = ${target_id}`);
    send(client, {
      event: response,
      data: {
        request_id: params.request_id,
        error: "no client with id = " + target_id,
      },
    });
  }
};

const myname = async (client, params) => {
  let client_id = params.client_id;
  let version = params.version;
  client.id = client_id;
  client.version = version;
  client.on("close", () => {
    onSocketClose(client_id);
  });
  clients.set(client_id, client);
  const [row] = await Client.findOrCreate({
    where: {
      id: client_id
    },
    defaults: {
      id: client_id
    }
  })
  row.set({
    online: 'Y'
  })
  await row.save();
  // clientNames[client_id] = params.name;
  // clientNames[params.name] = client_id;
};

export const dispatch = async (socket, params) => {
  if (!socket.id && params?.client_id && !clients.has(params.client_id)) {
    let client_id = params.client_id;
    socket.id = client_id;
    clients.set(client_id, socket);
  }
  switch (params?.event) {
    case "myname":
      logger.info(params);
      await myname(socket, params);
      break;
    case "request":
      logger.info(params);
      await request(socket, params);
      break;
    case "response":
      logger.info(params);
      await response(socket, params);
      break;
    case "heartbeat":
      // logger.info(params);
      break;
    default:
      break;
  }
};

export const initSocket = async (client) => {
  send(client, {
    event: "init",
    data: {},
  });
};

export const onSocketClose = async (client_id) => {
  clients.delete(client_id);
  await Client.update({online: 'N'}, {
    where: {
      id: client_id
    }
  })
  logger.info(client_id + " has now disconnected!");
  logger.info("now clients size " + clients.size);
};
