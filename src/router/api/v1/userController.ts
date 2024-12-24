import User from '@/db/models/user'
import db from '@/db'

export default (api) => {
  api.get('/sync', async(req, res) => {
    await db.sync();
    res.send("ok");
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
