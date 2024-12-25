import HyperExpress from "hyper-express";
import logger from "@/logger";
import userController from "./userController";
import { JWT_TOKEN_KEY } from "@/utils/protocol";
import { createVerifier } from "fast-jwt";

const verifySync = createVerifier({ key: JWT_TOKEN_KEY, cache: true });

const api_v1_router = new HyperExpress.Router();

api_v1_router.get("/test", async (req, res) => {
  // logger.info(req.locals.auth);
  res.send("ok");
});

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

api_v1_router.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || "";
  if (!token) {
    res.status(401).json({
      success: false,
      message: "Error!Token was not provided.",
    });
    return;
  }
  try {
    const decodedToken = verifySync(token);
    req.locals.auth = decodedToken;
    next();
  } catch (e) {
    res.status(401).json({
      success: false,
      message: "Error!Token was expired.",
    });
    return;
  }
});

userController(api_v1_router);
