const { decode, send } = require("../../../utils/protocol");
const logger = require("../../../logger");
const oracledb = require("oracledb");
const { v4: uuid } = require("uuid");

let pool = {};

const query = async (client, params) => {
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
    logger.info('没有客户端')
  }
};

const dispatch = async (socket, params) => {
  logger.info(params?.event)
  switch (params?.event) {
    case "query":
      await query(socket, params);
      break;
    default:
      break;
  }
};

const initSocket = async (client) => {
  let client_id = uuid();

  const conn = await oracledb.getConnection({
    user: "bosnds3",
    password: "abc123",
    connectString: "app.burgeonerp.cn:22990/testorcl",
  });

  pool[client_id] = conn;

  send(client, {
    event: "init",
    data: {
      client_id,
      pool_size: Object.keys(pool).length,
    },
  });
};

const onSocketClose = (socket) => {
  logger.info(socket.ip + " has now disconnected!");
};


module.exports = {
  dispatch,
  initSocket,
  onSocketClose,
};