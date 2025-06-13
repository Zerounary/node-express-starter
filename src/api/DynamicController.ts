import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import DynamicDataService from '../services/DynamicDataService';
import HookService from '../services/HookService';
import { Op } from 'sequelize';
import { logError } from "../logger";
import { checkPermission } from '../router/middlewares/permissionMiddleware';
import WorkflowService from '../services/WorkflowService';
import Papa from 'papaparse';
import sequelize from '../db/sequelize';

@Controller("/data/:tableName")
export default class DynamicController {

  private async getParsedWhere(filters: any, tenantId: number) {
      const where: any = { tenantId };
      const operatorMap = {
          eq: Op.eq, ne: Op.ne, gte: Op.gte, gt: Op.gt, lte: Op.lte, lt: Op.lt,
          in: Op.in, notIn: Op.notIn, like: Op.like, iLike: Op.iLike,
      };

      for (const key in filters) {
          const parts = key.split('-');
          if (parts.length === 2) {
              const [field, op] = parts;
              if (field && op && operatorMap[op]) {
                  let value = filters[key];
                  if (op === 'in' || op === 'notIn') {
                      value = value.split(',');
                  }
                  where[field] = { [operatorMap[op]]: value };
              }
          }
      }
      return where;
  }

  @Get("/list", [checkPermission('data:list::tableName')])
  async list(req, res) {
    try {
      const { tableName } = req.params;
      const { ...filters } = req.query;
      const where = await this.getParsedWhere(filters, req.user.tenantId);
      
      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      const data = await Model.findAll({ where });
      return ok(data);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Get("/page", [checkPermission('data:page::tableName')])
  async find(req, res) {
    try {
      const { tableName } = req.params;
      const { page = 1, pageSize = 10, ...filters } = req.query;
      const where = await this.getParsedWhere(filters, req.user.tenantId);

      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      
      const nPage = parseInt(page, 10);
      const nPageSize = parseInt(pageSize, 10);

      const { count, rows } = await Model.findAndCountAll({
        where,
        limit: nPageSize,
        offset: (nPage - 1) * nPageSize,
      });

      return ok({
        data: rows,
        pagination: {
          total: count,
          page: nPage,
          pageSize: nPageSize,
          totalPages: Math.ceil(count / nPageSize),
        }
      });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Get("/:id", [checkPermission('data:read::tableName')])
  async findOne(req, res) {
    try {
      const { tableName, id } = req.params;
      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      const instance = await Model.findOne({ where: { id, tenantId: req.user.tenantId } });
      if (!instance) {
        return fail("Instance not found", 404);
      }
      return ok(instance);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Post("/", [checkPermission('data:create::tableName')])
  async create(req, res) {
    try {
      const { tableName } = req.params;
      let body = await req.json();
      body.tenantId = req.user.tenantId;

      // beforeCreate hook
      const modifiedBody = await HookService.executeHook(tableName, 'beforeCreate', body, req);
      if (modifiedBody) {
        body = modifiedBody;
      }

      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      const instance = await Model.create(body);

      // afterCreate hook
      await HookService.executeHook(tableName, 'afterCreate', instance);


      return ok(instance);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Put("/:id", [checkPermission('data:update::tableName')])
  async update(req, res) {
    try {
      const { tableName, id } = req.params;
      const { tenantId } = req.user;
      let body = await req.json();

      // beforeUpdate hook
      const modifiedBody = await HookService.executeHook(tableName, 'beforeUpdate', id, body, req);
      if (modifiedBody) {
        body = modifiedBody;
      }

      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      const [affectedCount] = await Model.update(body, { where: { id, tenantId } });
      if (affectedCount === 0) {
        return fail("Instance not found or no changes made", 404);
      }

      // afterUpdate hook
      await HookService.executeHook(tableName, 'afterUpdate', id, body);

      return ok({ affectedCount });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Post("/:id/actions/:actionName", [checkPermission('data:action::actionName::tableName')])
  async performAction(req, res) {
    try {
      const { tenantId, id: userId } = req.user;
      const { tableName, id, actionName } = req.params;

      // afterUpdate hook
      let result = await HookService.executeHook(tableName, actionName, id);

            // Try to start a workflow for the new record
      await WorkflowService.createInstanceForRecord(req.user.tenantId, tableName, id);

      return ok(result);
    } catch (error) {
      logError(error);
      return fail(error.message, 400); // Use 400 for business logic errors
    }
  }

  @Delete("/:id", [checkPermission('data:delete::tableName')])
  async remove(req, res) {
    try {
      const { tableName, id } = req.params;
      const { tenantId } = req.user;

      // beforeDelete hook
      await HookService.executeHook(tableName, 'beforeDelete', id, req);

      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      const affectedCount = await Model.destroy({ where: { id, tenantId } });
      if (affectedCount === 0) {
        return fail("Instance not found", 404);
      }

      // afterDelete hook
      await HookService.executeHook(tableName, 'afterDelete', id);

      return ok({ affectedCount });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Get("/export", [checkPermission('data:export::tableName')])
  async exportData(req, res) {
    try {
      const { tenantId } = req.user;
      const { tableName } = req.params;
      const { ...filters } = req.query;
      const where = await this.getParsedWhere(filters, tenantId);

      const Model = await DynamicDataService.getModelForTable(tableName, tenantId);
      const data = await Model.findAll({ where, raw: true });

      if (data.length === 0) {
          return ok([]);
      }
      
      const csv = Papa.unparse(data);
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename=${tableName}.csv`);
      return res.send(csv);

    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Post("/import", [checkPermission('data:import::tableName')])
  async importData(req, res) {
    let transaction;
    try {
      const { tenantId } = req.user;
      const { tableName } = req.params;
      const csvBody = await req.text();

      const { data } = Papa.parse(csvBody, { header: true });
      
      const Model = await DynamicDataService.getModelForTable(tableName, tenantId);
      
      transaction = await sequelize.transaction();
      
      const recordsToCreate = data.map((row: any) => ({ ...row, tenantId }));
      await Model.bulkCreate(recordsToCreate, { transaction, validate: true });
      
      await transaction.commit();
      
      return ok({ success: true, count: data.length });

    } catch (error) {
      if (transaction) await transaction.rollback();
      logError(error);
      return fail(error.message, 400);
    }
  }
} 