var cache = require('memory-cache');
import App from "@/db/models/app";
import { ok, fail, ERROR_CODE } from "@/router/api/index";

export default (api) => {

  api.get('/apps', async(req, res) => {
    const apps = await App.findAll();
    res.json(ok(apps));
  })

  api.put("/app", async (req, res) => {
    let body = await req.json();
    console.log('🚀 ~ api.post ~ body:', body)
    const [affectedRows] = await App.update(body.data, {
      where: {
        id: body?.id
      }
    })
    res.json(ok(affectedRows));
  });

  api.post("/app", async (req, res) => {
    let body = await req.json();
    // console.log('🚀 ~ api.post ~ body:', body)
    const newRecord = await App.create(body)
    res.json(ok(newRecord));
  });
};
