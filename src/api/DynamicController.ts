import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import DynamicDataService from "../services/DynamicDataService";
import DataScopeService from "../services/DataScopeService";
import HookService from "../services/HookService";
import { Op } from "sequelize";
import { logError } from "../logger";
import { checkPermission } from "../router/middlewares/permissionMiddleware";
import WorkflowService from "../services/WorkflowService";
import Papa from "papaparse";
import sequelize from "../db/sequelize";
import { getTableConfig } from "@/hooks/table";
import { ColumnDataTypes } from "@/utils";

@Controller("/data/:tableName")
export default class DynamicController {
  // 用于优化性能的请求级表元数据缓存
  private tableMetaCache = new Map<string, any>();

  /**
   * 优化后的函数，用于高效地填充关联数据。
   * - 通过批量预加载减少数据库查询。
   * - 利用并行查询提升性能。
   * - 缓存表元数据以避免重复获取。
   * @param data 主表数据
   * @param columns 表字段配置
   * @param tenantId 租户ID
   * @returns 包含关联数据的结果
   */
  private async populateRelatedData(
    data: any[],
    columns: any[],
    tenantId: number
  ): Promise<any[]> {
    if (!data || data.length === 0) return data;

    const fkColumns = columns.filter(
      (c) => c.dataType === ColumnDataTypes.ID && c.relatedToTableId
    );
    if (fkColumns.length === 0) return data;

    // 1. 按关联表对所有外键ID进行分组
    const idsByTableId = new Map<number, Set<any>>();
    for (const column of fkColumns) {
      if (!idsByTableId.has(column.relatedToTableId)) {
        idsByTableId.set(column.relatedToTableId, new Set());
      }
      const idSet = idsByTableId.get(column.relatedToTableId)!;
      for (const item of data) {
        const fkId = item[column.fieldName];
        if (fkId != null) {
          idSet.add(fkId);
        }
      }
    }

    // 2. 批量获取关联表的元数据
    const { DynamicTable } = await import("../db/models");
    const allRelatedTableIds = Array.from(idsByTableId.keys());

    const tableDefs = await DynamicTable.findAll({
      where: { id: { [Op.in]: allRelatedTableIds } },
    });
    const tableDefMap = new Map(tableDefs.map((def) => [def.id, def]));

    // 3. 并行获取所有关联数据
    const dataFetchPromises = [];
    const relatedDataMap = new Map<string, Map<any, any>>(); // tableName -> {id -> data}

    for (const [tableId, ids] of idsByTableId.entries()) {
      if (ids.size === 0) continue;

      const def = tableDefMap.get(tableId);
      if (!def) continue;

      const tableName = def.alias_name || def.name;

      const promise = (async () => {
        const cacheKey = `tableConfig:${tableName}`;
        let tableConfig = this.tableMetaCache.get(cacheKey);
        if (!tableConfig) {
          tableConfig = await getTableConfig(tableName);
          this.tableMetaCache.set(cacheKey, tableConfig);
        }
        if (!tableConfig) return;

        const dk = tableConfig.columns.find((col) => col.dk === true);
        const attributes: any[] = ["id"];
        if (dk && dk.fieldName !== "id") {
          attributes.push([dk.fieldName, "name"]);
        }

        const model = await DynamicDataService.getModelForTable(
          tableName,
          tenantId
        );
        const relatedData = await model.findAll({
          attributes,
          where: {
            id: { [Op.in]: Array.from(ids) },
            tenantId,
          },
        });

        const itemMap = new Map();
        for (const item of relatedData) {
          const jsonItem = item.toJSON();
          itemMap.set(jsonItem.id, jsonItem);
        }
        relatedDataMap.set(tableName, itemMap);
      })().catch((error) => {
        logError(
          new Error(
            `Failed to fetch related data for table ${tableName}: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      });

      dataFetchPromises.push(promise);
    }

    await Promise.all(dataFetchPromises);

    // 4. 将获取到的数据填充回结果集
    const result = data.map((item) => ({ ...item }));
    const tableNameMap = new Map(
      Array.from(tableDefMap.entries()).map(([id, def]) => [
        id,
        def.alias_name || def.name,
      ])
    );

    for (const item of result) {
      for (const column of fkColumns) {
        const fkId = item[column.fieldName];
        if (fkId == null) continue;

        const tableName = tableNameMap.get(column.relatedToTableId);
        if (!tableName) continue;

        const tableData = relatedDataMap.get(tableName);
        if (tableData && tableData.has(fkId)) {
          // 在这里，我们用获取到的对象替换了原来的ID
          item[`${column.fieldName}Name`] = tableData.get(fkId);
        }
      }
    }

    return result;
  }

  private async getParsedWhere(req: any, filters: any) {
    const { user, params } = req;
    const { tenantId } = user;
    const { tableName } = params;

    const where: any = { tenantId };
    const operatorMap = {
      eq: Op.eq,
      ne: Op.ne,
      gte: Op.gte,
      gt: Op.gt,
      lte: Op.lte,
      lt: Op.lt,
      in: Op.in,
      notIn: Op.notIn,
      like: Op.like,
      iLike: Op.iLike,
    };

    for (const key in filters) {
      const parts = key.split("-");
      if (parts.length === 2) {
        const [field, op] = parts;
        let value: any = filters[key];
        if (value === "true") value = true;
        else if (value === "false") value = false;

        if (field && op && operatorMap[op]) {
          if (op === "like") {
            value = `%${value}%`;
          }
          if (op === "in" || op === "notIn") {
            value = value.split(",");
          }
          where[field] = { [operatorMap[op]]: value };
        } else if (field) {
          where[field] = { [Op.eq]: value };
        }
      } else {
        where[key] = { [Op.eq]: filters[key] };
      }
    }

    // Apply data scope
    const dataScopeWhere = await DataScopeService.getDataScopeWhere(
      user.id,
      tableName
    );

    if (Reflect.ownKeys(dataScopeWhere).length > 0) {
      return { [Op.and]: [where, dataScopeWhere] };
    }

    return where;
  }

  private getParsedSorts(sorts: any, defaultSorts: any): any[] {
    // sorts 格式： field1-ASC,field2-DESC
    if (!sorts) {
      sorts = defaultSorts;
      if(!sorts) return [];
    };
    const order: any[] = [];
    const sortItems = Array.isArray(sorts) ? sorts : sorts.split(",");
    for (const sortItem of sortItems) {
      const [field, direction] = sortItem.split("-");
      if (field) {
        order.push([
          field,
          direction && direction.toUpperCase() === "DESC" ? "DESC" : "ASC",
        ]);
      }
    }
    return order;
  }

  @Get("/list", [checkPermission("data::tableName:list")])
  async list(req, res) {
    try {
      const { tableName } = req.params;
      const { sorts, ...filters } = req.query;
      const where = await this.getParsedWhere(req, filters);

      // 获取表配置
      const tableConfig = await getTableConfig(tableName);
      const order = this.getParsedSorts(sorts, tableConfig?.defaultSort);
      if (!tableConfig) {
        return fail("表配置未找到", 404);
      }

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        req.user.tenantId
      );

      // 查询主表数据
      const data = await Model.findAll({ where, order });
      const jsonData = data.map((item) => item.toJSON());

      // 手动填充关联数据
      const populatedData = await this.populateRelatedData(
        jsonData,
        tableConfig.columns,
        req.user.tenantId
      );

      return ok(populatedData);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Get("/page", [checkPermission("data::tableName:page")])
  async find(req, res) {
    try {
      const { tableName } = req.params;
      const { page = 1, pageSize = 10, sorts, ...filters } = req.query;
      const where = await this.getParsedWhere(req, filters);

      // 获取表配置
      const tableConfig = await getTableConfig(tableName);
      const order = this.getParsedSorts(sorts, tableConfig?.defaultSort);
      if (!tableConfig) {
        return fail("表配置未找到", 404);
      }

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        req.user.tenantId
      );

      const nPage = parseInt(page, 10);
      const nPageSize = parseInt(pageSize, 10);

      // 查询主表数据
      const { count, rows } = await Model.findAndCountAll({
        where,
        order,
        limit: nPageSize,
        offset: (nPage - 1) * nPageSize,
      });

      const jsonData = rows.map((item) => item.toJSON());

      // 手动填充关联数据
      const populatedData = await this.populateRelatedData(
        jsonData,
        tableConfig.columns,
        req.user.tenantId
      );

      return ok({
        items: populatedData,
        total: count,
      });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  /**
   * 搜索数据，通过 ak 搜索展示id和dk
   */
  @Get("/search", [checkPermission("data::tableName:page")])
  async search(req, res) {
    try {
      const { tableName } = req.params;
      const { page = 1, pageSize = 10, keyword, ...filters } = req.query;

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        req.user.tenantId
      );

      const nPage = parseInt(page, 10);
      const nPageSize = parseInt(pageSize, 10);

      // 获取表配置，查找ak和dk字段
      const tableConfig = await getTableConfig(tableName);

      if (!tableConfig) {
        return fail("表配置未找到", 404);
      }

      // 查找ak字段（用于搜索）和dk字段（用于显示）
      const akColumn = tableConfig.columns.find((col) => col.ak === true);
      const dkColumn = tableConfig.columns.find((col) => col.dk === true);

      const ak = akColumn ? akColumn.fieldName : "name"; // 默认使用name字段
      const dk = dkColumn ? dkColumn.fieldName : ak; // 如果没有dk字段，使用ak字段

      // 构建查询条件
      const where: any = { tenantId: req.user.tenantId };

      // 添加关键词搜索条件
      if (keyword) {
        where[ak] = {
          [Op.like]: `%${keyword}%`,
        };
      }

      // 添加其他过滤条件
      const additionalWhere = await this.getParsedWhere(req, filters);
      Object.assign(where, additionalWhere);

      // 确定要返回的字段
      const attributes = ["id"];
      if (dk && dk !== "id") {
        attributes.push(dk);
      }
      // 如果ak和dk不同，也包含ak字段用于搜索匹配
      if (ak !== dk && ak !== "id") {
        attributes.push(ak);
      }

      const { count, rows } = await Model.findAndCountAll({
        attributes,
        where,
        limit: nPageSize,
        offset: (nPage - 1) * nPageSize,
      });

      // 格式化返回数据，确保每个项目都有name字段用于显示
      const formattedRows = rows.map((row) => {
        const item = row.toJSON();
        return {
          id: item.id,
          name: item[dk] || item[ak] || item.id, // 优先使用dk字段，其次ak字段，最后使用id
          [dk]: item[dk],
          [ak]: item[ak],
        };
      });

      return ok({
        items: formattedRows,
        total: count,
      });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Get("/:id", [checkPermission("data::tableName:read")])
  async findOne(req, res) {
    try {
      const { tableName, id } = req.params;

      // 获取表配置
      const tableConfig = await getTableConfig(tableName);
      if (!tableConfig) {
        return fail("表配置未找到", 404);
      }

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        req.user.tenantId
      );

      // 查询主表数据
      const instance = await Model.findOne({
        where: { id, tenantId: req.user.tenantId },
      });

      if (!instance) {
        return fail("Instance not found", 404);
      }

      const jsonData = instance.toJSON();

      // 手动填充关联数据
      const populatedData = await this.populateRelatedData(
        [jsonData],
        tableConfig.columns,
        req.user.tenantId
      );

      return ok(populatedData);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Post("", [checkPermission("data::tableName:create")])
  async create(req, res) {
    try {
      const { tableName } = req.params;
      let body = await req.json();
      body.tenantId = req.user.tenantId;

      // beforeCreate hook
      const modifiedBody = await HookService.executeHook(
        tableName,
        "beforeCreate",
        body,
        req
      );
      if (modifiedBody) {
        body = modifiedBody;
      }

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        req.user.tenantId
      );

      let result = await sequelize.transaction(async (t) => {
        const instance = await Model.create(body);

        // afterCreate hook
        await HookService.executeHook(tableName, "afterCreate", instance);

        return ok(instance);
      });

      return result;
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Put("/:id", [checkPermission("data::tableName:update")])
  async update(req, res) {
    try {
      const { tableName } = req.params;
      const id = Number(req.params.id);
      const { tenantId } = req.user;
      let body = await req.json();

      // beforeUpdate hook
      const modifiedBody = await HookService.executeHook(
        tableName,
        "beforeUpdate",
        id,
        body,
        req
      );
      if (modifiedBody) {
        body = modifiedBody;
      }

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        req.user.tenantId
      );
      let result = await sequelize.transaction(async (t) => {
        const [affectedCount] = await Model.update(body, {
          where: { id, tenantId },
        });
        if (affectedCount === 0) {
          return fail("Instance not found or no changes made", 404);
        }

        // afterUpdate hook
        await HookService.executeHook(tableName, "afterUpdate", id, body);

        return ok({ affectedCount });
      });
      return result;
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Delete("/:id", [checkPermission("data::tableName:delete")])
  async remove(req, res) {
    try {
      const { tableName } = req.params;
      const id = Number(req.params.id);
      const { tenantId } = req.user;

      // beforeDelete hook
      await HookService.executeHook(tableName, "beforeDelete", id, req);

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        req.user.tenantId
      );
      const affectedCount = await Model.destroy({ where: { id, tenantId } });
      if (affectedCount === 0) {
        return fail("Instance not found", 404);
      }

      // afterDelete hook
      await HookService.executeHook(tableName, "afterDelete", id);

      return ok({ affectedCount });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Get("/export", [checkPermission("data::tableName:export")])
  async exportData(req, res) {
    try {
      const { tenantId } = req.user;
      const { tableName } = req.params;
      const { ...filters } = req.query;
      const where = await this.getParsedWhere(req, filters);

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        tenantId
      );
      const data = await Model.findAll({ where, raw: true });

      if (data.length === 0) {
        return ok([]);
      }

      const csv = Papa.unparse(data);
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
    let transaction;
    try {
      const { tenantId } = req.user;
      const { tableName } = req.params;
      const csvBody = await req.text();

      const { data } = Papa.parse(csvBody, { header: true });

      const Model = await DynamicDataService.getModelForTable(
        tableName,
        tenantId
      );

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
