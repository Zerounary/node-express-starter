import HyperExpress from 'hyper-express'
const webserver = new HyperExpress.Server();

// const api_v1_router = require("./router/api/v1");
import ws_router from '@/router/ws/index'

// webserver.use("/api/v1", api_v1_router);
webserver.use("/ws", ws_router);

// Activate webserver by calling .listen(port, callback);
const port = 90;
webserver
  .listen(port)
  .then(() => console.log(`Webserver started on port ${port}`))
  .catch(() => console.log(`Failed to start webserver on port ${port}`));
