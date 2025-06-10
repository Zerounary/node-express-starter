import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import DynamicDataService from '../services/DynamicDataService';
import HookService from '../services/HookService';

@Controller("/data/:tableName")
export default class DynamicController {

  @Get("/")
  async find(req, res) {
    try {
      const { tableName } = req.params;
      const Model = await DynamicDataService.getModelForTable(tableName);
      const data = await Model.findAll();
      return ok(data);
    } catch (error) {
      return fail(error.message);
    }
  }

  @Get("/:id")
  async findOne(req, res) {
    try {
      const { tableName, id } = req.params;
      const Model = await DynamicDataService.getModelForTable(tableName);
      const instance = await Model.findByPk(id);
      if (!instance) {
        return fail("Instance not found", 404);
      }
      return ok(instance);
    } catch (error) {
      return fail(error.message);
    }
  }

  @Post("/")
  async create(req, res) {
    try {
      const { tableName } = req.params;
      let body = await req.json();

      // beforeCreate hook
      const modifiedBody = await HookService.executeHook(tableName, 'beforeCreate', body);
      if (modifiedBody) {
        body = modifiedBody;
      }

      const Model = await DynamicDataService.getModelForTable(tableName);
      const instance = await Model.create(body);

      // afterCreate hook
      await HookService.executeHook(tableName, 'afterCreate', instance);

      return ok(instance);
    } catch (error) {
      return fail(error.message);
    }
  }

  @Put("/:id")
  async update(req, res) {
    try {
      const { tableName, id } = req.params;
      let body = await req.json();

      // beforeUpdate hook
      const modifiedBody = await HookService.executeHook(tableName, 'beforeUpdate', id, body);
      if (modifiedBody) {
        body = modifiedBody;
      }

      const Model = await DynamicDataService.getModelForTable(tableName);
      const [affectedCount] = await Model.update(body, { where: { id } });
      if (affectedCount === 0) {
        return fail("Instance not found or no changes made", 404);
      }

      // afterUpdate hook
      await HookService.executeHook(tableName, 'afterUpdate', id, body);

      return ok({ affectedCount });
    } catch (error) {
      return fail(error.message);
    }
  }

  @Delete("/:id")
  async remove(req, res) {
    try {
      const { tableName, id } = req.params;

      // beforeDelete hook
      await HookService.executeHook(tableName, 'beforeDelete', id);

      const Model = await DynamicDataService.getModelForTable(tableName);
      const affectedCount = await Model.destroy({ where: { id } });
      if (affectedCount === 0) {
        return fail("Instance not found", 404);
      }

      // afterDelete hook
      await HookService.executeHook(tableName, 'afterDelete', id);

      return ok({ affectedCount });
    } catch (error) {
      return fail(error.message);
    }
  }
} 