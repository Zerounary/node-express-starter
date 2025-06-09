import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import DynamicDataService from '../services/DynamicDataService';

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
      const body = await req.json();
      const Model = await DynamicDataService.getModelForTable(tableName);
      const instance = await Model.create(body);
      return ok(instance);
    } catch (error) {
      return fail(error.message);
    }
  }

  @Put("/:id")
  async update(req, res) {
    try {
      const { tableName, id } = req.params;
      const body = await req.json();
      const Model = await DynamicDataService.getModelForTable(tableName);
      const [affectedCount] = await Model.update(body, { where: { id } });
      if (affectedCount === 0) {
        return fail("Instance not found or no changes made", 404);
      }
      return ok({ affectedCount });
    } catch (error) {
      return fail(error.message);
    }
  }

  @Delete("/:id")
  async remove(req, res) {
    try {
      const { tableName, id } = req.params;
      const Model = await DynamicDataService.getModelForTable(tableName);
      const affectedCount = await Model.destroy({ where: { id } });
      if (affectedCount === 0) {
        return fail("Instance not found", 404);
      }
      return ok({ affectedCount });
    } catch (error) {
      return fail(error.message);
    }
  }
} 