import { Op } from "sequelize";
import { logError } from "../logger";
import { ColumnDataTypes, isCreatable, isUpdatable } from "@/utils";
import CacheService from "@/services/CacheService";
import DataScopeService from "./DataScopeService";
import DynamicDataService from "./DynamicDataService";
import HookService from "./HookService";
import sequelize from "../db/sequelize";
import { getDefaultValue } from "@/utils/parse";
import Papa from "papaparse";
import { DynamicTable } from "../db/models";

export interface CreateOptions {
  req?: any;
  withUpdate: boolean;
}

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
      llike: Op.like,
      rlike: Op.like,
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
          if (op === "llike") {
            value = `${value}%`;
          }
          if (op === "rlike") {
            value = `%${value}`;
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
    let { ak, dk } = CacheService.getTableAkDkByName(tableName);

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

  async queryIdByAk(tableName: string, akValue: string, tenantId: number) {
    const Model = await DynamicDataService.getModelForTable(
      tableName,
      tenantId
    );
    const { ak } = CacheService.getTableAkDkByName(tableName);
    let result: any = await Model.findOne({
      attributes: ["id"],
      where: { [ak]: akValue, tenantId },
      raw: true,
    });
    return result?.id;
  }

  async queryDkById(tableName: string, id: number, tenantId: number) {
    const Model = await DynamicDataService.getModelForTable(
      tableName,
      tenantId
    );
    const { dk } = CacheService.getTableAkDkByName(tableName);
    let result: any = await Model.findOne({
      attributes: [dk],
      where: { id, tenantId },
      raw: true,
    });
    return result?.dk;
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

  async create(tableName: string, body: any, user: any, options?: any) {
    const Model = await DynamicDataService.getModelForTable(
      tableName,
      user.tenantId
    );

    return await sequelize.transaction(async (t) => {
      let tableConfig = await CacheService.getTableByAliasName(tableName);
      let row: any = {};
      let columns = tableConfig.columns.filter(
        (e) =>
          isCreatable(e.ui?.mask) ||
          (options?.withUpdate && isUpdatable(e.ui?.mask))
      );
      for (const col of columns) {
        const fieldName = col.name;
        if (Object.prototype.hasOwnProperty.call(body, fieldName)) {
          // 如果是外键字段，并且不是数字，则查询对应的ID
          if (
            col.dataType === ColumnDataTypes.ID &&
            col.relatedToTableId &&
            body[fieldName] &&
            isNaN(body[fieldName])
          ) {
            // 根据ak查询对应的ID
            let refTableConfig = await CacheService.getTableById(
              col.relatedToTableId
            );
            let refId = await this.queryIdByAk(
              refTableConfig.name,
              body[fieldName],
              user.tenantId
            );
            if (refId) {
              row[fieldName] = refId;
            }
          } else if( col.dataType == ColumnDataTypes.ENUM ) {
            let val = body[fieldName]
            let option = col.ui?.componentProps?.options?.find(e => e.value == val);
            if(!option) {
              option = col.ui?.componentProps?.options?.find(e => e.label == val);
            } 
            if(option) {
              row[fieldName] = option.value;
            } else {
              row[fieldName] = body[fieldName];
            }
          } else if(col.dataType == ColumnDataTypes.BOOLEAN) {
            let val = body[fieldName];
            if(typeof val === 'string') {
              if(val.toLowerCase() === 'true' || val === '1' || val === '是') {
                row[fieldName] = true;
              } else if(val.toLowerCase() === 'false' || val === '0' || val === '否') {
                row[fieldName] = false;
              } else {
                row[fieldName] = val;
              }
            }
          } else if([ColumnDataTypes.REGION, ColumnDataTypes.JSON].includes(col.dataType)) {
            // JSON 类型，且传入的是字符串，则尝试转换
            if(body[fieldName] && typeof body[fieldName] === 'string') {
              try {
                row[fieldName] = JSON.parse(body[fieldName]);
              } catch(e) {
                row[fieldName] = body[fieldName];
              }
            } else {
              row[fieldName] = body[fieldName];
            }
          } else {
            // 默认赋值
            row[fieldName] = body[fieldName];
          }
        } else {
          row[fieldName] = getDefaultValue(col);
        }
      }
      row.tenantId = user.tenantId;
      const modifiedBody = await HookService.executeHook(
        tableName,
        "beforeCreate",
        row,
        options?.req
      );
      if (modifiedBody) {
        row = modifiedBody;
      }

      const instance = await Model.create(row, { transaction: t });
      await HookService.executeHook(
        tableName,
        "afterCreate",
        instance,
        options?.req
      );
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
      const updatableColumns = new Set(
        tableConfig.columns
          .filter((c) => isUpdatable(c.ui?.mask))
          .map((c) => c.name)
      );

      for (const fieldName of Object.keys(body)) {
        if (updatableColumns.has(fieldName)) {
          row[fieldName] = body[fieldName];
        }
      }

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

    let data = await this.getExportData(tableName, user, where);
    if (!data || data.length === 0) {
      return "";
    }
    // 替换第一行的列名为中文
    const tableConfig = await CacheService.getTableByAliasName(tableName);
    if (!tableConfig) {
      throw new Error("表配置未找到");
    }
    const columnMap = new Map(
      tableConfig.columns.map((col) => [col.name, col.description || col.name])
    );
    let csv = Papa.unparse(data, {
      header: true,
      newline: '\r\n',
    } );
    // TODO 待优化性能问题
    const lines = csv.split("\r\n");

    const headerCols = lines[0].split(",");
    const newHeaderCols = headerCols.map((col) =>
      columnMap.get(col) ? `"${columnMap.get(col)}"` : col
    );
    lines[0] = newHeaderCols.join(",");
    csv = lines.join("\r\n");

    return "\uFEFF" + csv;
  }

  async getExportData(tableName, user, where) {
    const Model = await DynamicDataService.getModelForTable(
      tableName,
      user.tenantId
    );
    const tableConfig = await CacheService.getTableByAliasName(tableName);
    if (!tableConfig) {
      throw new Error("表配置未找到");
    }

    // 主表真实表名
    const mainTableName = tableConfig.name || Model.getTableName?.();

    // 收集外键列
    const fkColumns = tableConfig.columns.filter(
      (c: any) => c.dataType === ColumnDataTypes.ID && c.relatedToTableId
    );
    const includeColumns: string[] = [];
    const attributesInclude: any[] = [];

    if (fkColumns.length > 0) {
      const allRelatedTableIds = Array.from(
        new Set(fkColumns.map((c: any) => c.relatedToTableId))
      );
      const tableDefs = await DynamicTable.findAll({
        where: { id: { [Op.in]: allRelatedTableIds } },
      });
      const tableDefMap = new Map(tableDefs.map((def: any) => [def.id, def]));

      for (const col of fkColumns) {
        const def = tableDefMap.get(col.relatedToTableId);
        if (!def) continue;
        const relatedAliasOrName = def.alias_name || def.name;

        const relatedTableConfig = await CacheService.getTableByAliasName(
          relatedAliasOrName
        );
        if (!relatedTableConfig) continue;

        const dkCol = relatedTableConfig.columns.find(
          (cc: any) => cc.dk === true
        );
        const dk = dkCol?.name || "id";

        const RelatedModel = await DynamicDataService.getModelForTable(
          relatedAliasOrName,
          user.tenantId
        );
        const relatedTableName =
          relatedTableConfig.name || RelatedModel.getTableName?.();

        // 子查询：同租户 + id 匹配
        const subquery = `(SELECT rt.${dk} FROM ${relatedTableName} AS rt WHERE rt.id = ${mainTableName}.${
          col.name
        } AND rt.tenantId = ${Number(user.tenantId)} LIMIT 1)`;

        attributesInclude.push([sequelize.literal(subquery), `${col.name}`]);
        includeColumns.push(col.name);
      }
    }

    // 处理枚举类型字段
    const enumColumns = tableConfig.columns.filter(
      (c: any) => c.dataType === ColumnDataTypes.ENUM
    );

    for (const col of enumColumns) {
      if (
        col.ui?.componentProps?.options &&
        Array.isArray(col.ui.componentProps.options) &&
        col.ui.componentProps.options.length > 0
      ) {
        const optionsMap = new Map(
          col.ui.componentProps.options.map((opt: any) => [opt.value, opt.label])
        );
        const caseQueryParts = [];
        caseQueryParts.push(`CASE ${mainTableName}.${col.name}`);
        for (const [value, label] of optionsMap.entries()) {
          caseQueryParts.push(
            `WHEN ${sequelize.escape((value as string))} THEN ${sequelize.escape((label as string))}`
          );
        }
        caseQueryParts.push(`ELSE ${mainTableName}.${col.name} END`);

        attributesInclude.push([sequelize.literal(caseQueryParts.join(" ")), col.name])
        includeColumns.push(col.name);
      }
    }

    // 处理 布尔类型字段
    const boolColumns = tableConfig.columns.filter(
      (c: any) => c.dataType === ColumnDataTypes.BOOLEAN
    );
    for (const col of boolColumns) {
      const caseQueryParts = [];
      caseQueryParts.push(`CASE ${mainTableName}.${col.name}`);
      caseQueryParts.push(`WHEN true THEN '是'`);
      caseQueryParts.push(`WHEN false THEN '否'`);
      caseQueryParts.push(`ELSE '' END`);
      attributesInclude.push([sequelize.literal(caseQueryParts.join(" ")), col.name])
      includeColumns.push(col.name);
    }

    // 处理 JSON 类型字段
    const jsonColumns = tableConfig.columns.filter(
      (c: any) => [ColumnDataTypes.JSON, ColumnDataTypes.REGION].includes(c.dataType)
    );

    for (const col of jsonColumns) {
      // 转成字符串
      const jsonQuery = `COALESCE(CAST(${mainTableName}.${col.name} AS CHAR), '')`;
      attributesInclude.push([sequelize.literal(jsonQuery), col.name])
      includeColumns.push(col.name);
    }
  
    const data = await Model.findAll({
      where,
      attributes: { include: attributesInclude },
      raw: true,
    });
    return data || [];
  }

  async importData(
    tableName: string,
    csvBody: string,
    user: any,
    options: { mode?: "insertTop" | "insertBottom" } = { mode: "insertTop" }
  ) {
    const { tenantId } = user;
    const tableConfig = await CacheService.getTableByAliasName(tableName);
    if (!tableConfig) {
      throw new Error("表配置未找到");
    }
    // 移除末尾的换行符
    csvBody = csvBody.replace(/[\r\n]+$/g, "");
    const columnMap = new Map(
      tableConfig.columns.map((col) => [col.description, col.name])
    );
    const { data } = Papa.parse(csvBody, { header: true, transformHeader: h => {
      let key = columnMap.get(h)
      return key || h;
    } });

    if (!data || data.length === 0) {
      return { success: true, count: 0 };
    }

    let errors = [];
    const recordsToCreate = data.map((row: any) => ({ ...row, tenantId }));
    for (let i = 0; i < recordsToCreate.length; i++) {
      let record = recordsToCreate[i];
      try {
        await this.create(tableName, record, user, {
          withUpdate: true,
        });
      } catch (err) {
        errors.push({
          row: i + 1,
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
    }
    return {
      msg: "操作成功",
      success: errors.length === 0,
      count: recordsToCreate.length,
      errors,
    };
  }
}

export default new DynamicService();
