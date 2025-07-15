import { DynamicTable } from "@/db/models";

export async function getPageConfig(id, params) {
  console.log('getPageConfig', id, params);
  let table = await DynamicTable.findOne({where: { id }})
  if(!table)  {
    throw new Error('Table not found');
  }
  let columns = await table.getColumns();
  return {
    ...table.dataValues,
    columns,
  }
} 