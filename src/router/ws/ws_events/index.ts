import { decode, send } from '@/utils/protocol'
import logger from '@/logger'
import oracledb from 'oracledb'
import { v4 as uuid } from 'uuid'

let pool = {};
let clients = {};
let clientNames = {};
let sqlData = {};

const queryLocalDB = async (client, params) => {
  let client_id = params.client_id;
  if (pool[client_id]) {
    let db = pool[client_id];
    const res = await db.execute(params.sql);
    let columns = res.metaData.map((meta) => ({
      name: meta.name,
      ty: meta.dbTypeName,
      nullable: meta.nullable,
    }));

    send(client, {
      columns,
      rows: res.rows,
    });
  } else {
    logger.info("没有客户端");
  }
};

const query = async (client, params) => {
  let client_id = params.client_id;
  let request_id = params.request_id;
  let target_id = clientNames[params.customer];
  console.log('客户的链接id', target_id)
  if (clients[target_id]) {
    let target_client = clients[target_id];
    send(target_client, {
      event: "query",
      data: {
        request_id,
        sql: params.sql,
      },
    });
    // 记录hash结果
    sqlData[`${target_id}:${params.request_id}`] = {
      client_id,
      data: null,
    };
  } else {
    logger.info(clientNames);
  }
};

const data = async (client, params) => {
  let client_id = params.client_id;
  console.log('client_id', params)
  console.log(sqlData)
  let target_id = sqlData[`${client_id}:${params.request_id}`]?.client_id;
  logger.info('data target_id = ', target_id)
  if (clients[target_id]) {
    let target_client = clients[target_id];
    send(target_client, {
      event: "data",
      data: {
        request_id: params.request_id,
        sql: params.sql,
        data: params.data,
      },
    });
  } else {
    console.log('data:没有客户端')
  }
};

const myname = async (client, params) => {
  let client_id = params.client_id;
  clientNames[client_id] = params.name;
  clientNames[params.name] = client_id;
};

export const dispatch = async (socket, params) => {
  logger.info(params?.event);
  switch (params?.event) {
    case "myname":
      await myname(socket, params);
      break;
    case "query":
      await query(socket, params);
      break;
    case "data":
      await data(socket, params);
      break;
    default:
      break;
  }
};

export const initSocket = async (client) => {
  let client_id = uuid();

  const conn = await oracledb.getConnection({
    user: "bosnds3",
    password: "abc123",
    connectString: "app.burgeonerp.cn:22990/testorcl",
  });

  pool[client_id] = conn;
  clients[client_id] = client;

  send(client, {
    event: "init",
    data: {
      client_id,
      pool_size: Object.keys(pool).length,
    },
  });
};

export const onSocketClose = (socket) => {
  logger.info(socket.ip + " has now disconnected!");
};