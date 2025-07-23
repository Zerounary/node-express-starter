import { systemTables } from "@/db/init";
import { DynamicTable } from "@/db/models";

export async function beforeCreate(data) {
  data.alias_name = data.alias_name || data.name;
}

export async function afterCreate(data) {
  // TODO 为这个表创建默认字段，id，createdAt, updatedAt，创建人，修改人
}

export async function beforeDelete(id) {
  // TODO 删除其关联的所有字段
}

export async function getPageConfig(id, params) {
  let tableName = params.tableName
  let table = await DynamicTable.findOne({where: { alias_name: tableName }})
  if(!table)  {
    throw new Error('Table not found');
  }
  let columns = (await table.getColumns()).sort((a, b) => a.orderno - b.orderno);
  return {
    id: table.id,
    table: table.alias_name || table.name,
    name: table.description,
    columns: columns.map(col => ({
      id: col.id,
      fieldName: col.name,
      label: col.description,
      ak: col.ak,
      dk: col.dk,
      ...col.ui,
    })),
  }
} 