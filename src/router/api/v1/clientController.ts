import Client from '@/db/models/client';
var cache = require('memory-cache');

export default (api) => {

  api.get('/clients', async(req, res) => {
    const clients = await Client.findAll();
    let result = JSON.stringify(clients, null, 2);
    res.send(result);
  })

  api.post("/client", async (req, res) => {
    let body = await req.json();
    console.log('🚀 ~ api.post ~ body:', body)
    const [affectedRows] = await Client.update({
      name: body.name
    }, {
      where: {
        id: body?.id
      }
    })
    res.send(affectedRows);
  });
};
