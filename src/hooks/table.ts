import { tableInitColumns } from "@/db/init";
import { DynamicColumn } from "@/db/models";
import CacheService from "@/services/CacheService";
import DynamicDataService from "@/services/DynamicDataService";

export async function beforeCreate(data) {
  data.alias_name = data.alias_name || data.name;
}

export async function afterCreate(data) {
  // TODO 为这个表创建默认字段，id，createdAt, updatedAt，创建人，修改人
  console.log("afterCreate", data);
  const tableId = data.id;
  const tenantId = data.tenantId || 1; // 默认租户ID为1
  let columns = tableInitColumns();
  for (const column of columns) {
    await DynamicColumn.create({
      tenantId,
      tableId,
      ...column,
    });
  }
  await CacheService.reloadTable(data.name);
}

export async function afterUpdate(data) {
  await CacheService.reloadTable(data.name);
}

export async function beforeDelete(id) {
  // TODO 删除其关联的所有字段
  const tableId = id;
  await DynamicColumn.destroy({ where: { tableId } });
}

export async function afterDelete(data) {
  await CacheService.reloadTable(data.name);
}

export async function syncTable({id: tableId, user}) {
  const table = await CacheService.getTableById(tableId);
  const Model = await DynamicDataService.getModelForTable(
    table.name,
    user.tenantId
  );
  await Model.sync({ alter: true });
  return {
    message: "Table synchronized successfully",
  }
}

export async function getPageConfig({tableName}) {
  return await getTableConfig(tableName);
}

export async function getTableConfig(tableName) {
  const table = await CacheService.getTableByAliasName(tableName);
  if (!table) {
    throw new Error("Table not found");
  }
  return getTableConfigById(table.id);
}

export async function getTableConfigById(tableId: number) {
  const table = await CacheService.getTableById(tableId);
  if (!table) {
    throw new Error("Table not found");
  }
  const columns = [...table.columns].sort(
    (a, b) => a.orderno - b.orderno
  );

  const relatedTables = {};
  for (const col of columns) {
    if (col.relatedToTableId) {
      const relatedTable = await CacheService.getTableById(col.relatedToTableId);
      if (relatedTable) {
        relatedTables[col.relatedToTableId] = relatedTable.alias_name || relatedTable.name;
      }
    }
  }

  const actions = [...table.actions].sort(
    (a, b) => a.orderno - b.orderno
  )

  return {
    id: table.id,
    table: table.alias_name || table.name,
    name: table.description,
    hideMenu: table.hideMenu,
    actions,
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
