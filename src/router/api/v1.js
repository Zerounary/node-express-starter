const HyperExpress = require("hyper-express");
const logger = require("../../logger");

const api_v1_router = new HyperExpress.Router();

api_v1_router.get("/", async (req, res) => {
  logger.info(req.query);
  res.send("ok");
});

api_v1_router.post("/", async (req, res) => {
  let body = await req.json();
  logger.info({
    ...body,
    ...req.query,
  });
  res.send("ok");
});

api_v1_router.get("/orc", async (req, res) => {
  logger.info(req.query);
  res.send("ok");
});

module.exports = api_v1_router;
