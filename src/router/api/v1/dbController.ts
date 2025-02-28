var cache = require("memory-cache");
import DbModel from "@/db/models/db";
import { ok, fail, ERROR_CODE } from "@/router/api/index";

export default (api) => {
  api.get("/dbs", async (req, res) => {
    const dbs = await DbModel.findAll();
    res.json(ok(dbs));
  });

  api.put("/db", async (req, res) => {
    let body = await req.json();
    const [affectedRows] = await DbModel.update(body.data, {
      where: {
        id: body?.id,
      },
    });
    res.json(ok(affectedRows));
  });

  api.post("/db", async (req, res) => {
    let body = await req.json();
    const newRecord = await DbModel.create(body);
    res.json(ok(newRecord));
  });
};
