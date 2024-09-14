const HyperExpress = require("hyper-express");
const webserver = new HyperExpress.Server();

const api_v1_router = require("./router/api/v1");

webserver.use("/api/v1", api_v1_router);

// Activate webserver by calling .listen(port, callback);
const port = 90;
webserver
  .listen(port)
  .then((socket) => console.log(`Webserver started on port ${port}`))
  .catch((error) => console.log(`Failed to start webserver on port ${port}`));
