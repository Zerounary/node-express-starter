import { Controller, Post } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { DynamicTable, DynamicColumn, TableCategory, TableAction } from "../db/models";
import logger from "../logger";
import { syncTable } from "../hooks/table";
import CacheService from "../services/CacheService";

@Controller("/schemas")
export default class SchemaController {

  @Post("/import")
  async importSchemas(req, res) {
    const { tenantId, ...user } = req.user;
    const results = {
      categories: { success: [], failed: [] },
      tables: { success: [], failed: [] },
      columns: { success: [], failed: [] },
      actions: { success: [], failed: [] },
      sync: { success: [], failed: [] },
    };

    try {
      const body = await req.json();
      const tablesToImport = Array.isArray(body) ? body : body.tables;
      if (!tablesToImport || !Array.isArray(tablesToImport)) {
        return fail("Invalid import data format. Expected an array of tables or an object with a 'tables' property.");
      }

      // 1. 导入表类别
      const oldCategoryIdToNewId = new Map<number, number>();
      const rootCategories = body.categories || [];

      // 使用迭代方式按层级导入，因为 body.categories 已经是树状结构
      const importQueue = rootCategories.map(c => ({ ...c, newParentId: null }));
      while (importQueue.length > 0) {
        const categoryData = importQueue.shift();
        if (!categoryData) continue;

        try {
          if (!categoryData.name) continue;
          const [category] = await TableCategory.findOrCreate({
            where: { name: categoryData.name, parentId: categoryData.newParentId, tenantId },
            defaults: { ...categoryData, id: undefined, parentId: categoryData.newParentId, tenantId }
          });
          oldCategoryIdToNewId.set(categoryData.id, category.id);
          results.categories.success.push({ name: categoryData.name });

          if (categoryData.children && categoryData.children.length > 0) {
            const childrenToQueue = categoryData.children.map(child => ({ ...child, newParentId: category.id }));
            importQueue.push(...childrenToQueue);
          }
        } catch (error) {
          logger.error(error);
          results.categories.failed.push({ name: categoryData.name, reason: error.message });
        }
      }

      // 2. 导入表 (仅定义)
      const oldTableIdToNewId = new Map<number, number>();
      const oldTableIdToName = new Map<number, string>();
      const createdTables = [];
      for (const tableData of tablesToImport) {
        try {
          const { columns, actions, categoryId: oldCategoryId, ...tableInfo } = tableData;
          const categoryId = oldCategoryId ? oldCategoryIdToNewId.get(oldCategoryId) : null;
          
          const newTable = await DynamicTable.create({
            ...tableInfo,
            id: undefined,
            tenantId,
            categoryId,
          });
          oldTableIdToNewId.set(tableData.id, newTable.id);
          oldTableIdToName.set(tableData.id, tableData.name);
          createdTables.push({ ...tableData, newTable });
          results.tables.success.push({ name: tableData.name });
        } catch (error) {
          logger.error(error);
          results.tables.failed.push({ name: tableData.name, reason: error.message });
        }
      }
      
      const tableNameToIdMap = new Map<string, number>();
      createdTables.forEach(({ newTable }) => {
        tableNameToIdMap.set(newTable.name, newTable.id);
        if (newTable.alias_name) {
          tableNameToIdMap.set(newTable.alias_name, newTable.id);
        }
      });

      // 3. 导入表字段和表动作
      for (const { newTable, columns, actions } of createdTables) {
        const tableId = newTable.id;

        if (columns && Array.isArray(columns)) {
          for (let column of columns) {
            try {
              if (column.relatedToTableName) {
                const relatedTableId = tableNameToIdMap.get(column.relatedToTableName);
                if (relatedTableId) {
                  column.relatedToTableId = relatedTableId;
                } else {
                  const existingTable = await CacheService.getTableByName(column.relatedToTableName) || await CacheService.getTableByAliasName(column.relatedToTableName);
                  if (existingTable) {
                    column.relatedToTableId = existingTable.id;
                  } else {
                    logger.error(`Import Warning: Could not find related table '${column.relatedToTableName}' for column '${column.name}' in table '${newTable.name}'.`);
                  }
                }
              }
              await DynamicColumn.create({ ...column, id: undefined, tableId, tenantId });
              results.columns.success.push({ tableName: newTable.name, columnName: column.name });
            } catch (error) {
              logger.error(error);
              results.columns.failed.push({ tableName: newTable.name, columnName: column.name, reason: error.message });
            }
          }
        }

        if (actions && Array.isArray(actions)) {
          for (const action of actions) {
            try {
              await TableAction.create({ ...action, id: undefined, tableId, tenantId });
              results.actions.success.push({ tableName: newTable.name, actionName: action.name });
            } catch (error) {
              logger.error(error);
              results.actions.failed.push({ tableName: newTable.name, actionName: action.name, reason: error.message });
            }
          }
        }
      }

      // 4. 物理化所有新建的表并初始化缓存
      for (const { newTable } of createdTables) {
        try {
          await CacheService.reloadTable(newTable.name);
          await syncTable({ ids: null, id: newTable.id, user: { tenantId, ...user } });
          results.sync.success.push({ name: newTable.name });
        } catch (error) {
          logger.error(error);
          results.sync.failed.push({ name: newTable.name, reason: error.message });
        }
      }

      return ok(results);
    } catch (error) {
      logger.error(error);
      return fail(error.message);
    }
  }
}