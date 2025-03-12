import HyperExpress from "hyper-express";
import logger from "@/logger";
import userController from "./userController";
import { AI, AI_Stream } from "@/ai";
import { ok, fail, ERROR_CODE } from "@/router/api/index";
import clientController from "./clientController";
import appController from "./appController";
import dbController from "./dbController";
import { jwt_mid } from "@/router/auth";

const api_v1_router = new HyperExpress.Router();

api_v1_router.get("/ai", async (req, res) => {
  let text = req.query.text;
  try {
    let aiRsp = await AI([
      {
        role: "user",
        content: text,
      },
    ]);
    res.json(ok(aiRsp));
  } catch (e) {
    res.json(fail(ERROR_CODE.COMMON, e));
  }
});

api_v1_router.post("/ai", async (req, res) => {
  let body = await req.json();
  try {
    let aiRsp = await AI(body);
    res.json(ok(aiRsp));
  } catch (e) {
    res.json(fail(ERROR_CODE.COMMON, e));
  }
});

api_v1_router.get("/ai-stream", async (req, res) => {
  let text = req.query.text;
  try {
    // 设置响应头以支持流式传输
    // 设置编码为 utf-8
    res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // res.flushHeaders();

    let stream = await AI_Stream([
      {
        role: "user",
        content: text,
      },
    ]);

    for await (const part of stream) {
      let text = part.choices[0]?.delta?.content || ''
      res.write(text);
    }
    res.end();

  } catch (e) {
    console.error("Error creating chat completion:", e);
    res.status(500).send("Error creating chat completion");
  }
});

api_v1_router.post("/ai-stream", async (req, res) => {
  let body = await req.json();
  try {
    // 设置响应头以支持流式传输
    // 设置编码为 utf-8
    res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // res.flushHeaders();

    let stream = await AI_Stream(body);

    for await (const part of stream) {
      let text = part.choices[0]?.delta?.content || ''
      res.write(text);
    }
    res.end();

  } catch (e) {
    console.error("Error creating chat completion:", e);
    res.status(500).send("Error creating chat completion");
  }
});

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


api_v1_router.use(jwt_mid);

userController(api_v1_router);
clientController(api_v1_router);
appController(api_v1_router);
dbController(api_v1_router);