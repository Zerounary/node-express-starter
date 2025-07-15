import { systemTables } from "@/db/init";
import { DynamicTable } from "@/db/models";

export async function getPageConfig(id, params) {
  let tableName = params.tableName
  let table = await DynamicTable.findOne({where: { alias_name: tableName }})
  if(!table)  {
    throw new Error('Table not found');
  }
  let columns = await table.getColumns();
  return {
    id: table.id,
    table: table.alias_name || table.name,
    name: table.description,
    columns: columns.map(col => ({
      id: col.id,
      fieldName: col.name,
      label: col.description,
      ...col.ui,
    })),
  }
} 