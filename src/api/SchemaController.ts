import { Controller, Post, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { DynamicTable, DynamicColumn } from "../db/models";
import SchemaService from '../services/SchemaService';
import { z } from 'zod';
import { logError } from "../logger";

const columnSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  dataType: z.enum(['STRING', 'TEXT', 'INTEGER', 'FLOAT', 'DOUBLE', 'DECIMAL', 'BOOLEAN', 'DATE', 'JSON', 'RELATIONSHIP', 'ENUM']),
  relationshipType: z.enum(['one-to-one', 'one-to-many']).optional().nullable(),
  relatedToTableId: z.number().int().optional().nullable(),
  enumValues: z.array(z.string()).optional().nullable(),
});

const createTableSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  description: z.string().optional(),
  columns: z.array(columnSchema),
});

@Controller("/schemas")
export default class SchemaController {

  @Post("/tables")
  async createTable(req, res) {
    try {
      const { tenantId } = req.user;
      const body = await req.json();
      const validationResult = createTableSchema.safeParse(body);
      if (!validationResult.success) {
        return fail(validationResult.error.errors, 400);
      }
      const { name, description, columns } = validationResult.data;

      // 1. 创建表定义
      const table = await DynamicTable.create({ name, description, tenantId });

      // 2. 创建列定义
      if (columns && columns.length > 0) {
        const columnDefs = columns.map(c => ({ ...c, tableId: table.id }));
        await DynamicColumn.bulkCreate(columnDefs);
      }

      // 3. 在数据库中创建物理表
      await SchemaService.createTableFromDefinition(table.id);

      return ok(table);
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Put('/tables/:name')
  async mergeTable(req, res) {
    try {
      const { tenantId } = req.user;
      const { name: tableName } = req.params;
      const body = await req.json();
      const validationResult = createTableSchema.safeParse({ name: tableName, ...body });
      if (!validationResult.success) {
        return fail(validationResult.error.errors, 400);
      }
      const { columns: newColumns } = validationResult.data;

      const table = await DynamicTable.findOne({ where: { name: tableName, tenantId }, include: [{ model: DynamicColumn, as: 'columns' }] });

      if (!table) {
        return fail('Table not found in your tenant', 404);
      }

      const existingColumns = table.columns || [];
      const existingColumnNames = existingColumns.map(c => c.name);
      const newColumnNames = newColumns.map(c => c.name);

      // 找出要删除的列
      const columnsToDelete = existingColumns.filter(c => !newColumnNames.includes(c.name));
      for (const col of columnsToDelete) {
        await SchemaService.dropColumn(tableName, col.name, tenantId);
        await col.destroy();
      }

      // 找出要新增和修改的列
      for (const newCol of newColumns) {
        const existingCol = existingColumns.find(c => c.name === newCol.name);
        if (existingCol) {
          // 修改列
          if (existingCol.dataType !== newCol.dataType) {
            await existingCol.update({ dataType: newCol.dataType });
            await SchemaService.changeColumn(tableName, newCol.name, existingCol, tenantId);
          }
        } else {
          // 新增列
          const column = await DynamicColumn.create({ ...newCol, tableId: table.id });
          await SchemaService.addColumnFromDefinition(column.id);
        }
      }

      return ok({ message: 'Table merged successfully' });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Post("/columns")
  async addColumn(req, res) {
    try {
        const { name, dataType, tableId } = await req.json();
        
        // 1. 创建列定义
        const column = await DynamicColumn.create({ name, dataType, tableId });
        
        // 2. 在物理表中添加列
        await SchemaService.addColumnFromDefinition(column.id);

        return ok(column);
    } catch (error) {
        logError(error);
        return fail(error.message);
    }
  }

  @Delete('/tables/:tableName/columns/:columnName')
  async deleteColumn(req, res) {
    try {
      const { tenantId } = req.user;
      const { tableName, columnName } = req.params;

      const table = await DynamicTable.findOne({ where: { name: tableName, tenantId } });
      if (!table) {
        return fail('Table not found in your tenant', 404);
      }

      const column = await DynamicColumn.findOne({ where: { name: columnName, tableId: table.id } });
      if (!column) {
        return fail('Column not found', 404);
      }

      await SchemaService.dropColumn(tableName, columnName, tenantId);
      await column.destroy();

      return ok({ message: 'Column deleted successfully' });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }
} 