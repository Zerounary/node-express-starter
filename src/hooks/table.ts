import { defaultColumns, systemTables } from "@/db/init";
import { DynamicColumn, DynamicTable } from "@/db/models";

export async function beforeCreate(data) {
  data.alias_name = data.alias_name || data.name;
}

export async function afterCreate(data) {
  // TODO 为这个表创建默认字段，id，createdAt, updatedAt，创建人，修改人
  console.log("afterCreate", data);
  const tableId = data.id;
  const tenantId = data.tenantId || 1; // 默认租户ID为1
  let columns = defaultColumns([]);
  for (const column of columns) {
    await DynamicColumn.create({
      tenantId,
      tableId,
      ...column,
    });
  }
}

export async function beforeDelete(id) {
  // TODO 删除其关联的所有字段
  const tableId = id;
  await DynamicColumn.destroy({ where: { tableId } });
}

export async function getPageConfig({tableName}) {
  return await getTableConfig(tableName);
}

export async function getTableConfig(tableName) {
  let table = await DynamicTable.findOne({ where: { alias_name: tableName } });
  if (!table) {
    throw new Error("Table not found");
  }
  return getTableConfigById(table.id);
}

export async function getTableConfigById(tableId: number) {
  let table = await DynamicTable.findByPk(tableId);
  if (!table) {
    throw new Error("Table not found");
  }
  let columns = (await table.getColumns()).sort(
    (a, b) => a.orderno - b.orderno
  );

  const relatedTables = {};
  for (const col of columns) {
    if (col.relatedToTableId) {
      const relatedTable = await DynamicTable.findByPk(col.relatedToTableId);
      if (relatedTable) {
        relatedTables[col.relatedToTableId] = relatedTable.alias_name || relatedTable.name;
      }
    }
  }

  return {
    id: table.id,
    table: table.alias_name || table.name,
    name: table.description,
    columns: columns.map((col) => ({
      id: col.id,
      fieldName: col.name,
      label: col.description,
      ak: col.ak,
      dk: col.dk,
      sortable: col.sortable,
      dataType: col.dataType,
      relatedToTableId: col.relatedToTableId,
      relatedToTableName: relatedTables[col.relatedToTableId],
      ...col.ui,
    })),
  };
}
