import HyperExpress from "hyper-express";
import { crossMid } from "./utils/middleware";

const webserver = new HyperExpress.Server({
  max_body_buffer: 1024 * 1,
  max_body_length: 1024 * 1024 * 300,
});

// 跨域设置
webserver.use(crossMid);

export default webserver; 