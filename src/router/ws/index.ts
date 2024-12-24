import HyperExpress from "hyper-express";
import { dispatch, initSocket, onSocketClose } from "./ws_events";
import logger from '@/logger'
import { decode } from "@/utils/protocol"
const ws_router = new HyperExpress.Router();

// websocket
ws_router.ws(
  "/connect",
  {
    idle_timeout: 60,
    max_payload_length: 32 * 1024,
  },
  async (socket) => {
    logger.info(socket.ip + " is now connected using websockets!");

    // 初始化记录
    socket.on("message", async (msg) => {
      await dispatch(socket, decode(msg));
    });

    // 关闭连接
    socket.on("close", onSocketClose);

    await initSocket(socket);
  }
);

export default ws_router;
