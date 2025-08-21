import { Controller, Post, Put } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { DataScope } from "../db/models/DataScope";
import { checkPermission } from '../router/middlewares/permissionMiddleware';

@Controller("/data_scopes")
export default class DataScopeController {

  @Post("/findOne", [checkPermission('data:data_scopes:read')])
  async findOne(req, res) {
    try {
      const { where } = await req.json();
      const instance = await DataScope.findOne({ where });
      return ok(instance);
    } catch (error) {
      return fail(error.message);
    }
  }

  @Post("/create", [checkPermission('data:data_scopes:create')])
  async create(req, res) {
    try {
      const body = await req.json();
      const instance = await DataScope.create(body);
      return ok(instance);
    } catch (error) {
      return fail(error.message);
    }
  }

  @Put("/:id", [checkPermission('data:data_scopes:update')])
  async update(req, res) {
    try {
      const { id } = req.params;
      const body = await req.json();
      const [affectedCount] = await DataScope.update(body, { where: { id } });
      if (affectedCount === 0) {
        return fail("Instance not found or no changes made", 404);
      }
      return ok({ affectedCount });
    } catch (error) {
      return fail(error.message);
    }
  }
}