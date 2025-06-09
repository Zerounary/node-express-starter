import { Controller, Post } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { DynamicTable, DynamicColumn } from "../db/models";
import SchemaService from '../services/SchemaService';

@Controller("/schemas")
export default class SchemaController {

  @Post("/tables")
  async createTable(req, res) {
    try {
      const { name, description, columns } = await req.json();

      // 1. 创建表定义
      const table = await DynamicTable.create({ name, description });

      // 2. 创建列定义
      if (columns && columns.length > 0) {
        const columnDefs = columns.map(c => ({ ...c, tableId: table.id }));
        await DynamicColumn.bulkCreate(columnDefs);
      }

      // 3. 在数据库中创建物理表
      await SchemaService.createTableFromDefinition(table.id);

      return ok(table);
    } catch (error) {
      console.error(error);
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
        console.error(error);
        return fail(error.message);
    }
  }
} 