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
import { getTableConfig } from "@/hooks/table";
import { ColumnDataTypes } from "@/utils";

@Controller("/data/:tableName")
export default class DynamicController {

  /**
   * 手动查询外键关联数据
   * @param data 主表数据
   * @param columns 表字段配置
   * @param tenantId 租户ID
   * @returns 包含关联数据的结果
   */
  private async populateRelatedData(data: any[], columns: any[], tenantId: number): Promise<any[]> {
    if (!data || data.length === 0) return data;
    
    const result = data.map(item => ({ ...item }));
    
    for (const column of columns) {
      if (column.dataType === ColumnDataTypes.ID && column.relatedToTableId) {
        try {
          // 根据relatedToTableId获取关联表的信息
          const { DynamicTable } = await import('../db/models');
          const relatedTableDef = await DynamicTable.findByPk(column.relatedToTableId);
          
          if (relatedTableDef) {
            const relatedTableName = relatedTableDef.alias_name || relatedTableDef.name;
            const relatedModel = await DynamicDataService.getModelForTable(relatedTableName, tenantId);
            const relatedTableConfig = await getTableConfig(relatedTableName);
            
            // 收集所有需要查询的外键ID
            const foreignKeyIds = result
              .map(item => item[column.fieldName])
              .filter(id => id != null);
            
            if (foreignKeyIds.length > 0) {
              // 批量查询关联数据
              const dk = relatedTableConfig.columns.find(col => col.dk === true);
              const attributes: any[] = ['id'];
              if (dk && dk !== 'id') {
                attributes.push([dk.fieldName, 'name']);
              }

              const relatedData = await relatedModel.findAll({
                attributes,
                where: {
                  id: { [Op.in]: foreignKeyIds },
                  tenantId
                }
              });
              
              // 创建ID到数据的映射
              const relatedDataMap = new Map();
              relatedData.forEach(item => {
                const jsonItem = item.toJSON();
                relatedDataMap.set(jsonItem.id, jsonItem);
              });
              
              // 将关联数据添加到结果中
              const aliasName = column.fieldName;
              result.forEach(item => {
                if (item[column.fieldName] && relatedDataMap.has(item[column.fieldName])) {
                  item[aliasName] = relatedDataMap.get(item[column.fieldName]);
                }
              });
            }
          }
        } catch (error) {
          logError(new Error(`Failed to populate related data for ${column.fieldName}: ${error instanceof Error ? error.message : String(error)}`));
        }
      }
    }
    
    return result;
  }

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
                  if(op == 'like') {
                    value = `%${value}%`;
                  }
                  if (op === 'in' || op === 'notIn') {
                      value = value.split(',');
                  }
                  where[field] = { [operatorMap[op]]: value };
              } else if(field) {
                // 默认处理为等于
                where[field] = { [Op.eq]: filters[key] };
              }
          }
      }

      // TODO 此处根据用户角色进行数据权限过滤
      return where;
  }

  private getParsedSorts(sorts: any): any[] {
    if (!sorts || !Array.isArray(sorts)) {
        return [];
    }

    const order = [];
    for (const sort of sorts) {
        if (typeof sort === 'object' && sort !== null) {
            for (const field in sort) {
                const direction = (sort[field] || '').toString().toUpperCase();
                if (direction === 'ASC' || direction === 'DESC') {
                    order.push([field, direction]);
                }
            }
        }
    }
    return order;
  }

  @Get("/list", [checkPermission('data:list::tableName')])
  async list(req, res) {
    try {
      const { tableName } = req.params;
      const { sorts, ...filters } = req.query;
      const where = await this.getParsedWhere(filters, req.user.tenantId);
      const order = this.getParsedSorts(sorts);
      
      // 获取表配置
      const tableConfig = await getTableConfig(tableName);
      if (!tableConfig) {
        return fail("表配置未找到", 404);
      }
      
      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      
      // 查询主表数据
      const data = await Model.findAll({ where, order });
      const jsonData = data.map(item => item.toJSON());
      
      // 手动填充关联数据
      const populatedData = await this.populateRelatedData(jsonData, tableConfig.columns, req.user.tenantId);
      
      return ok(populatedData);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Get("/page", [checkPermission('data:page::tableName')])
  async find(req, res) {
    try {
      const { tableName } = req.params;
      const { page = 1, pageSize = 10, sorts, ...filters } = req.query;
      const where = await this.getParsedWhere(filters, req.user.tenantId);
      const order = this.getParsedSorts(sorts);

      // 获取表配置
      const tableConfig = await getTableConfig(tableName);
      if (!tableConfig) {
        return fail("表配置未找到", 404);
      }

      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      
      const nPage = parseInt(page, 10);
      const nPageSize = parseInt(pageSize, 10);

      // 查询主表数据
      const { count, rows } = await Model.findAndCountAll({
        where,
        order,
        limit: nPageSize,
        offset: (nPage - 1) * nPageSize,
      });

      const jsonData = rows.map(item => item.toJSON());
      
      // 手动填充关联数据
      const populatedData = await this.populateRelatedData(jsonData, tableConfig.columns, req.user.tenantId);

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
  @Get("/search", [checkPermission('data:page::tableName')])
  async search(req, res) {
    try {
      const { tableName } = req.params;
      const { page = 1, pageSize = 10, keyword, ...filters } = req.query;

      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      
      const nPage = parseInt(page, 10);
      const nPageSize = parseInt(pageSize, 10);

      // 获取表配置，查找ak和dk字段
      const tableConfig = await getTableConfig(tableName);

      if (!tableConfig) {
        return fail("表配置未找到", 404);
      }

      // 查找ak字段（用于搜索）和dk字段（用于显示）
      const akColumn = tableConfig.columns.find(col => col.ak === true);
      const dkColumn = tableConfig.columns.find(col => col.dk === true);
      
      const ak = akColumn ? akColumn.fieldName : 'name'; // 默认使用name字段
      const dk = dkColumn ? dkColumn.fieldName : ak; // 如果没有dk字段，使用ak字段

      // 构建查询条件
      const where: any = { tenantId: req.user.tenantId };
      
      // 添加关键词搜索条件
      if (keyword) {
        where[ak] = {
          [Op.like]: `%${keyword}%`
        };
      }

      // 添加其他过滤条件
      const additionalWhere = await this.getParsedWhere(filters, req.user.tenantId);
      Object.assign(where, additionalWhere);

      // 确定要返回的字段
      const attributes = ['id'];
      if (dk && dk !== 'id') {
        attributes.push(dk);
      }
      // 如果ak和dk不同，也包含ak字段用于搜索匹配
      if (ak !== dk && ak !== 'id') {
        attributes.push(ak);
      }

      const { count, rows } = await Model.findAndCountAll({
        attributes,
        where,
        limit: nPageSize,
        offset: (nPage - 1) * nPageSize,
      });

      // 格式化返回数据，确保每个项目都有name字段用于显示
      const formattedRows = rows.map(row => {
        const item = row.toJSON();
        return {
          id: item.id,
          name: item[dk] || item[ak] || item.id, // 优先使用dk字段，其次ak字段，最后使用id
          [dk]: item[dk],
          [ak]: item[ak]
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

  @Get("/:id", [checkPermission('data:read::tableName')])
  async findOne(req, res) {
    try {
      const { tableName, id } = req.params;
      
      // 获取表配置
      const tableConfig = await getTableConfig(tableName);
      if (!tableConfig) {
        return fail("表配置未找到", 404);
      }
      
      const Model = await DynamicDataService.getModelForTable(tableName, req.user.tenantId);
      
      // 查询主表数据
      const instance = await Model.findOne({ 
        where: { id, tenantId: req.user.tenantId }
      });
      
      if (!instance) {
        return fail("Instance not found", 404);
      }
      
      const jsonData = instance.toJSON();
      
      // 手动填充关联数据
      const populatedData = await this.populateRelatedData([jsonData], tableConfig.columns, req.user.tenantId);
      
      return ok(populatedData);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Post("", [checkPermission('data:create::tableName')])
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