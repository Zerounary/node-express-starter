import User from '@/db/models/user'
import db from '@/db'
var cache = require('memory-cache');

export default (api) => {

  api.get('/sync', async(req, res) => {
    await db.sync();
    res.send("ok");
  })

  api.get('/user', async(req, res) => {
    // console.log("🚀 ~ api.get ~ users:", users.length)
    if(cache.get('users')) {
      let result = cache.get('users');
      res.send(result);
    } else {
      const users = await User.findAll();
      let result = JSON.stringify(users, null, 2);
      cache.put('users', result, 1000 * 60 * 60 * 24);
      res.send(result);
    }
  })

  api.post("/user", async (req, res) => {
    let body = await req.json();
    console.log('🚀 ~ api.post ~ body:', body)
    let user = await User.create({
      firstName: body.firstName,
      lastName: body.lastName,
    })
    console.log('🚀 ~ api.post ~ user:', user)
    res.send("ok");
  });
};
