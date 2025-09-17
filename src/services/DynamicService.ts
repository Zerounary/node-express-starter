import { Op } from "sequelize";
import { logError } from "../logger";
import { ColumnDataTypes, isCreatable } from "@/utils";
import CacheService from "@/services/CacheService";
import DataScopeService from "./DataScopeService";
import DynamicDataService from "./DynamicDataService";
import HookService from "./HookService";
import sequelize from "../db/sequelize";
import { getDefaultValue } from "@/utils/parse";
import Papa from "papaparse";
import { DynamicTable } from "../db/models";

class DynamicService {
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
        const fkId = item[column.name];
        if (fkId != null) {
          idSet.add(fkId);
        }
      }
    }

    // 2. 批量获取关联表的元数据
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
        let tableConfig = await CacheService.getTableByAliasName(tableName);

        if (!tableConfig) return;

        const dk = tableConfig.columns.find((col) => col.dk === true);
        const attributes: any[] = ["id"];
        if (dk && dk.name !== "id") {
          attributes.push([dk.name, "name"]);
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
        const fkId = item[column.name];
        if (fkId == null) continue;

        const tableName = tableNameMap.get(column.relatedToTableId);
        if (!tableName) continue;

        const tableData = relatedDataMap.get(tableName);
        if (tableData && tableData.has(fkId)) {
          // 在这里，我们用获取到的对象替换了原来的ID
          item[`${column.name}Name`] = tableData.get(fkId);
        }
      }
    }

    return result;
  }

  private async getParsedWhere(
    userId: number,
    tenantId: number,
    tableName: string,
    filters: any
  ) {
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
      userId,
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
      if (!sorts) return [];
    }
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

  async list(
    tableName: string,
    user: any,
    filters: any,
    sorts: string | undefined
  ) {
    const where = await this.getParsedWhere(
      user.id,
      user.tenantId,
      tableName,
      filters
    );

    const tableConfig = await CacheService.getTableByAliasName(tableName);
    if (!tableConfig) {
      throw new Error("表配置未找到");
    }
    const order = this.getParsedSorts(sorts, tableConfig?.defaultSort);

    const Model = await DynamicDataService.getModelForTable(
      tableName,
      user.tenantId
    );

    const data = await Model.findAll({ where, order });
    const jsonData = data.map((item) => item.toJSON());

    return await this.populateRelatedData(
      jsonData,
      tableConfig.columns,
      user.tenantId
    );
  }

  async page(
    tableName: string,
    user: any,
    filters: any,
    sorts: string | undefined,
    page: number,
    pageSize: number
  ) {
    const where = await this.getParsedWhere(
      user.id,
      user.tenantId,
      tableName,
      filters
    );

    const tableConfig = await CacheService.getTableByAliasName(tableName);
    if (!tableConfig) {
      throw new Error("表配置未找到");
    }
    const order = this.getParsedSorts(sorts, tableConfig?.defaultSort);

    const Model = await DynamicDataService.getModelForTable(
      tableName,
      user.tenantId
    );

    const { count, rows } = await Model.findAndCountAll({
      where,
      order,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const jsonData = rows.map((item) => item.toJSON());
    const populatedData = await this.populateRelatedData(
      jsonData,
      tableConfig.columns,
      user.tenantId
    );

    return {
      items: populatedData,
      total: count,
    };
  }

  async search(
    tableName: string,
    user: any,
    filters: any,
    keyword: string | undefined,
    page: number,
    pageSize: number
  ) {
    const Model = await DynamicDataService.getModelForTable(
      tableName,
      user.tenantId
    );

    const tableConfig = await CacheService.getTableByAliasName(tableName);
    if (!tableConfig) {
      throw new Error("表配置未找到");
    }

    const akColumn = tableConfig.columns.find((col) => col.ak === true);
    const dkColumn = tableConfig.columns.find((col) => col.dk === true);

    const ak = akColumn ? akColumn.name : "name";
    const dk = dkColumn ? dkColumn.name : ak;

    const where: any = { tenantId: user.tenantId };
    if (keyword) {
      where[ak] = { [Op.like]: `%${keyword}%` };
    }

    const additionalWhere = await this.getParsedWhere(
      user.id,
      user.tenantId,
      tableName,
      filters
    );
    Object.assign(where, additionalWhere);

    const attributes = ["id"];
    if (dk && dk !== "id") {
      attributes.push(dk);
    }
    if (ak !== dk && ak !== "id") {
      attributes.push(ak);
    }

    const { count, rows } = await Model.findAndCountAll({
      attributes,
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const formattedRows = rows.map((row) => {
      const item = row.toJSON();
      return {
        id: item.id,
        name: item[dk] || item[ak] || item.id,
        [dk]: item[dk],
        [ak]: item[ak],
      };
    });

    return {
      items: formattedRows,
      total: count,
    };
  }

  async findOne(tableName: string, id: number, user: any) {
    const tableConfig = await CacheService.getTableByAliasName(tableName);
    if (!tableConfig) {
      throw new Error("表配置未找到");
    }

    const Model = await DynamicDataService.getModelForTable(
      tableName,
      user.tenantId
    );

    const instance = await Model.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!instance) {
      throw new Error("Instance not found");
    }

    const jsonData = instance.toJSON();
    const populatedData = await this.populateRelatedData(
      [jsonData],
      tableConfig.columns,
      user.tenantId
    );

    return populatedData[0];
  }

  async create(tableName: string, body: any, user: any, req?: any) {
    const Model = await DynamicDataService.getModelForTable(
      tableName,
      user.tenantId
    );

    return await sequelize.transaction(async (t) => {
      let tableConfig = await CacheService.getTableByAliasName(tableName);
      let row: any = { tenantId: user.tenantId };
      tableConfig.columns
        .filter((e) => isCreatable(e.ui?.mask))
        .forEach((col) => {
          const fieldName = col.name;
          if (Object.prototype.hasOwnProperty.call(body, fieldName)) {
            row[fieldName] = body[fieldName];
          } else {
            row[fieldName] = getDefaultValue(col);
          }
        });

      const modifiedBody = await HookService.executeHook(
        tableName,
        "beforeCreate",
        row,
        req
      );
      if (modifiedBody) {
        row = modifiedBody;
      }

      const instance = await Model.create(row, { transaction: t });
      await HookService.executeHook(tableName, "afterCreate", instance, req);
      return instance;
    });
  }

  async update(tableName: string, id: number, body: any, user: any, req?: any) {
    const { tenantId } = user;

    const Model = await DynamicDataService.getModelForTable(
      tableName,
      tenantId
    );

    return await sequelize.transaction(async (t) => {
      let tableConfig = await CacheService.getTableByAliasName(tableName);
      let row: any = {};
      tableConfig.columns
        .filter((e) => isCreatable(e.ui?.mask))
        .forEach((col) => {
          const fieldName = col.name;
          if (Object.prototype.hasOwnProperty.call(body, fieldName)) {
            row[fieldName] = body[fieldName];
          } else {
            row[fieldName] = getDefaultValue(col);
          }
        });
      const modifiedBody = await HookService.executeHook(
        tableName,
        "beforeUpdate",
        id,
        row,
        req
      );
      if (modifiedBody) {
        row = modifiedBody;
      }

      const [affectedCount] = await Model.update(row, {
        where: { id, tenantId },
        transaction: t,
      });

      if (affectedCount === 0) {
        throw new Error("Instance not found or no changes made");
      }

      await HookService.executeHook(tableName, "afterUpdate", id, body, req);
      return { affectedCount };
    });
  }

  async remove(tableName: string, id: number, user: any, req?: any) {
    const { tenantId } = user;

    await HookService.executeHook(tableName, "beforeDelete", id, req);

    const Model = await DynamicDataService.getModelForTable(
      tableName,
      tenantId
    );
    const affectedCount = await Model.destroy({ where: { id, tenantId } });

    if (affectedCount === 0) {
      throw new Error("Instance not found");
    }

    await HookService.executeHook(tableName, "afterDelete", id, req);
    return { affectedCount };
  }

  async exportData(tableName: string, user: any, filters: any) {
    const where = await this.getParsedWhere(
      user.id,
      user.tenantId,
      tableName,
      filters
    );

    const Model = await DynamicDataService.getModelForTable(
      tableName,
      user.tenantId
    );
    const data = await Model.findAll({ where, raw: true });

    if (data.length === 0) {
      return "";
    }

    return Papa.unparse(data);
  }

  async importData(tableName: string, csvBody: string, user: any) {
    const { tenantId } = user;
    const { data } = Papa.parse(csvBody, { header: true });

    if (!data || data.length === 0) {
      return { success: true, count: 0 };
    }

    const Model = await DynamicDataService.getModelForTable(
      tableName,
      tenantId
    );

    const transaction = await sequelize.transaction();
    try {
      const recordsToCreate = data.map((row: any) => ({ ...row, tenantId }));
      await Model.bulkCreate(recordsToCreate, { transaction, validate: true });
      await transaction.commit();
      return { success: true, count: data.length };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export default new DynamicService();
