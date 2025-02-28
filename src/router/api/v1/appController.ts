var cache = require('memory-cache');
import App from "@/db/models/app";
import { ok, fail, ERROR_CODE } from "@/router/api/index";
import { get_app_name } from "@/utils";

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
    let count = await App.count({
      where: {
        name: body.name
      }
    });
    if(count > 0) {
      res.json(fail(ERROR_CODE.COMMON, 'name already exists'));
      return;
    }
    if(body.url && !body.app_name) {
      body.app_name = get_app_name(body.url)
    }
    const newRecord = await App.create(body)
    res.json(ok(newRecord));
  });
};
