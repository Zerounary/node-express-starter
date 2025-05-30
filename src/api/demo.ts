import Demo from "@/db/models/demo";
import { fail, ok } from "@/router/api";
import { Controller, Get, Post } from "@/utils/routeDecorators";

@Controller("/demo")
export default class demo {

  @Get("/list")
  async list12(req, res) {
    let list = await Demo.findAll();
    return ok(list)
  }


  @Post("/add")
  async add(req,res) {
    let body = await req.json();
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
