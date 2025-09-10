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
    try {
      const { tenantId } = req.user;
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
        if (!categoryData.name) continue;
        const [category] = await TableCategory.findOrCreate({
          where: { name: categoryData.name, tenantId },
          defaults: { ...categoryData, id: undefined, tenantId }
        });
        categoryNameToId.set(categoryData.name, category.id);
      }

      // 2. 导入表 (仅定义)
      const createdTables = [];
      for (const tableData of tablesToImport) {
        const { columns, actions, category, ...tableInfo } = tableData;
        const categoryId = category ? categoryNameToId.get(category.name) : null;
        
        const newTable = await DynamicTable.create({
          ...tableInfo,
          id: undefined,
          tenantId,
          categoryId,
        });
        createdTables.push({ ...tableData, newTable });
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
            await DynamicColumn.create({
              ...column,
              id: undefined,
              tableId,
              tenantId,
            });
          }
        }

        if (actions && Array.isArray(actions)) {
          for (const action of actions) {
            await TableAction.create({
              ...action,
              id: undefined,
              tableId,
              tenantId,
            });
          }
        }
      }

      // 4. 物理化所有新建的表并初始化缓存
      for (const { newTable } of createdTables) {
        // afterCreate钩子在添加自定义列/操作之前调用reloadTable，因此缓存已过时。
        // syncTable内部使用CacheService.getTableById。
        // 为确保syncTable获取完整的表定义，我们必须首先重新加载缓存。
        await CacheService.reloadTable(newTable.name);
        // `syncTable`将处理数据库模式同步和最终的缓存重新加载。
        await syncTable({ids: null, id: newTable.id, user: req.user });
      }

      return ok(null);
    } catch (error) {
      logger.error(error);
      return fail(error.message);
    }
  }
}