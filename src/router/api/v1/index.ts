import HyperExpress from 'hyper-express'
import logger from '@/logger'
import userController from './userController'

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
export default api_v1_router;


userController(api_v1_router)

