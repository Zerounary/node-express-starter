import Client from '@/db/models/client';
var cache = require('memory-cache');
import { ok, fail, ERROR_CODE } from "@/router/api/index";

export default (api) => {

  api.get('/clients', async(req, res) => {
    const clients = await Client.findAll();
    res.json(ok(clients));
  })

  api.post("/client", async (req, res) => {
    let body = await req.json();
    console.log('🚀 ~ api.post ~ body:', body)
    const [affectedRows] = await Client.update(body.data, {
      where: {
        id: body?.id
      }
    })
    res.json(ok(affectedRows));
  });
};
