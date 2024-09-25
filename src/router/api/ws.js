const HyperExpress = require("hyper-express");
const logger = require("../../logger");
const oracledb = require("oracledb");
const {v4: uuid} = require('uuid')

const ws_router = new HyperExpress.Router();

let pool = {};

// websocket
ws_router.ws(
  "/connect",
  {
    idle_timeout: 60,
    max_payload_length: 32 * 1024,
  },
  async (ws) => {
    console.log(ws.ip + " is now connected using websockets!");
    const send = (msg) => {
      ws.send(JSON.stringify(msg));
    };

    ws.on("close", () => console.log(ws.ip + " has now disconnected!"));
    ws.on("message", async (msg) => {
      console.log(ws.ip + " has sent a message!");
      console.log(msg);
      let req = JSON.parse(msg);
      console.log(req?.event);
      if (pool[client_id]) {
        let db = pool[client_id];
        const res = await db.execute(req.sql);
        let columns = res.metaData.map((meta) => ({
          name: meta.name,
          ty: meta.dbTypeName,
          nullable: meta.nullable,
        }));

        send({
            columns,
            rows: res.rows,
          })
      }
    });

    let client_id = uuid();

    const conn = await oracledb.getConnection({
      user: "bosnds3",
      password: "abc123",
      connectString: "app.burgeonerp.cn:22990/testorcl",
    });

    pool[client_id] = conn;

    send({
      event: "init",
      data: {
        client_id,
        pool_size: Object.keys(pool).length,
      },
    });
  }
);

module.exports = ws_router;
