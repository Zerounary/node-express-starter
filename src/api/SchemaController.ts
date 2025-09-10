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
      const categoryNameToId = new Map<string, number>();
      const allCategories = tablesToImport.map(t => t.category).filter(Boolean);
      const uniqueCategories = [...new Map(allCategories.map(item => [item['name'], item])).values()];

      for (const categoryData of uniqueCategories) {
        try {
          if (!categoryData.name) continue;
          const [category] = await TableCategory.findOrCreate({
            where: { name: categoryData.name, tenantId },
            defaults: { ...categoryData, id: undefined, tenantId }
          });
          categoryNameToId.set(categoryData.name, category.id);
          results.categories.success.push({ name: categoryData.name });
        } catch (error) {
          logger.error(error);
          results.categories.failed.push({ name: categoryData.name, reason: error.message });
        }
      }

      // 2. 导入表 (仅定义)
      const createdTables = [];
      for (const tableData of tablesToImport) {
        try {
          const { columns, actions, category, ...tableInfo } = tableData;
          const categoryId = category ? categoryNameToId.get(category.name) : null;
          
          const newTable = await DynamicTable.create({
            ...tableInfo,
            id: undefined,
            tenantId,
            categoryId,
          });
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