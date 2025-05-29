import Demo from "@/db/models/demo";
import { fail, ok } from "@/router/api";

export default class demo {
  async getlist(req, res) {
    let list = await Demo.findAll();
    return ok(list)
  }
  async postadd(req,res) {
    let body = await req.json();
    console.log('🚀 ~ api.post ~ body:', JSON.parse(''))
    if(body.name === undefined || body.name === '') {
        return fail('name is required');
    }
    let user = await Demo.create({
      name: body.name,
    })
    console.log('🚀 ~ api.post ~ user:', user)
    return ok(user);
  }
}
