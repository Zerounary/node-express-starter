import { DynamicTable } from "@/db/models";

export async function getPageConfig(id, params) {
  console.log('getPageConfig', id, params);
  let table = await DynamicTable.findOne({where: { id }})
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