import HyperExpress from "hyper-express";
const webserver = new HyperExpress.Server({
  max_body_buffer: 1024 * 1,
  max_body_length: 1024 * 1024 * 300,
});

import db from "./db";
import { initAssets } from "./assets";
import { crossMid } from "./utils/middleware";
import { RouteLoader } from "./utils/routeLoader";

// 跨域设置
webserver.use(crossMid);

initAssets(webserver);

const routeLoader = new RouteLoader(webserver, {
  controllerDir: "./src/api",
  prefix: "/api", // 全局路由前缀
  middlewares: [], // 全局中间件
});

routeLoader.load();


db.sync({ alter: true })
  .then(async (res) => {
    const port = 22987;
    webserver
      .listen(port)
      .then(async () => {
        console.log(`Webserver started on port ${port}`);
      })
      .catch(() => console.log(`Failed to start webserver on port ${port}`));
  })
  .catch(() => console.log(`Failed to sync database`));
