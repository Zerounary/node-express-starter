import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { logError } from "../logger";
import { checkPermission } from "../router/middlewares/permissionMiddleware";
import DynamicService from "../services/DynamicService";

@Controller("/data/:tableName")
export default class DynamicController {
  @Get("/list", [checkPermission("data::tableName:list")])
  async list(req, res) {
    try {
      const { tableName } = req.params;
      const { sorts, ...filters } = req.query;
      const data = await DynamicService.list(tableName, req.user, filters, sorts);
      return ok(data);
    } catch (error) {
      logError(error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      return fail(error.message, statusCode);
    }
  }

  @Get("/page", [checkPermission("data::tableName:page")])
  async find(req, res) {
    try {
      const { tableName } = req.params;
      const { page = 1, pageSize = 10, sorts, ...filters } = req.query;
      const nPage = parseInt(page, 10);
      const nPageSize = parseInt(pageSize, 10);

      const result = await DynamicService.page(
        tableName,
        req.user,
        filters,
        sorts,
        nPage,
        nPageSize
      );
      return ok(result);
    } catch (error) {
      logError(error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      return fail(error.message, statusCode);
    }
  }

  @Get("/search", [checkPermission("data::tableName:page")])
  async search(req, res) {
    try {
      const { tableName } = req.params;
      const { page = 1, pageSize = 10, keyword, ...filters } = req.query;
      const nPage = parseInt(page, 10);
      const nPageSize = parseInt(pageSize, 10);

      const result = await DynamicService.search(
        tableName,
        req.user,
        filters,
        keyword,
        nPage,
        nPageSize
      );
      return ok(result);
    } catch (error) {
      logError(error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      return fail(error.message, statusCode);
    }
  }

  @Get("/:id", [checkPermission("data::tableName:read")])
  async findOne(req, res) {
    try {
      const { tableName, id } = req.params;
      const data = await DynamicService.findOne(tableName, Number(id), req.user);
      return ok(data);
    } catch (error) {
      logError(error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      return fail(error.message, statusCode);
    }
  }

  @Post("", [checkPermission("data::tableName:create")])
  async create(req, res) {
    try {
      const { tableName } = req.params;
      const body = await req.json();
      const instance = await DynamicService.create(tableName, body, req.user, req);
      return ok(instance);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Put("/:id", [checkPermission("data::tableName:update")])
  async update(req, res) {
    try {
      const { tableName, id } = req.params;
      const body = await req.json();
      const result = await DynamicService.update(
        tableName,
        Number(id),
        body,
        req.user,
        req
      );
      return ok(result);
    } catch (error) {
      logError(error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      return fail(error.message, statusCode);
    }
  }

  @Delete("/:id", [checkPermission("data::tableName:delete")])
  async remove(req, res) {
    try {
      const { tableName, id } = req.params;
      const result = await DynamicService.remove(
        tableName,
        Number(id),
        req.user,
        req
      );
      return ok(result);
    } catch (error) {
      logError(error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      return fail(error.message, statusCode);
    }
  }

  @Get("/export", [checkPermission("data::tableName:export")])
  async exportData(req, res) {
    try {
      const { tableName } = req.params;
      const { ...filters } = req.query;
      const csv = await DynamicService.exportData(tableName, req.user, filters);

      if (!csv) {
        return ok([]);
      }

      res.header("Content-Type", "text/csv");
      res.header(
        "Content-Disposition",
        `attachment; filename=${tableName}.csv`
      );
      return res.send(csv);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Post("/import", [checkPermission("data::tableName:import")])
  async importData(req, res) {
    try {
      const { tableName } = req.params;
      const csvBody = await req.text();
      const result = await DynamicService.importData(
        tableName,
        csvBody,
        req.user
      );
      return ok(result);
    } catch (error) {
      logError(error);
      return fail(error.message, 400);
    }
  }
}
