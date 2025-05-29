import { fail, ok, ERROR_CODE } from "@/router/api/index";
import HyperExpress from "hyper-express";
import logger from "@/logger";
import { signSyc } from "@/utils/protocol";
import uploadController from "./uploadController";
import Demo from "@/db/models/demo";

const pub_router = new HyperExpress.Router();

pub_router.post("/login", async (req, res, next) => {
  let { name, password } = await req.json();
  let user = await Demo.findOne({
    where: {
      name,
    },
  });
  if(user?.password != password) {
    res.json(fail(ERROR_CODE, "登录失败，请检查账号密码"));
    return
  } 
  let token;
  try {
    token = signSyc({ id: user.id });
  } catch (err) {
    res.json(fail(ERROR_CODE, "login fail"));
    return
  }
  res.json(
    ok({
      token,
    })
  );
});

uploadController(pub_router);

export default pub_router;
