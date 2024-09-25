
const HyperExpress = require("hyper-express");
const logger = require("../../logger");

const ws_router = new HyperExpress.Router();

// websocket
ws_router.ws(
  "/connect",
  {
    idle_timeout: 60,
    max_payload_length: 32 * 1024,
  },
  async (ws) => {
    console.log(ws.ip + " is now connected using websockets!");
    ws.on("close", () => console.log(ws.ip + " has now disconnected!"));
    setTimeout(() => {
        ws.send("Hello World!")
    }, 1000)
  }
);

module.exports = ws_router;