import { tableInitColumns } from "@/db/init";
import { DynamicColumn } from "@/db/models";
import CacheService from "@/services/CacheService";
import DynamicDataService from "@/services/DynamicDataService";
import { AppError } from "@/utils";
import { getDefaultValue } from "@/utils/parse";

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

export async function afterUpdate(id) {
  let table = await CacheService.getTableById(id)
  await CacheService.reloadTable(table.alias_name);
}

export async function beforeDelete(id) {
  // TODO 删除其关联的所有字段
  const tableId = id;
  await DynamicColumn.destroy({ where: { tableId } });
}

export async function afterDelete(data) {
  await CacheService.reloadTable(data.name);
}

export async function exportTableConfig({ids, id: tableId, user, res}) {
  let tables = []
  if (tableId) {
    tables.push(await CacheService.getTableById(tableId))
  } else {
    if (ids.length === 0) {
      throw new Error("请至少选择一个数据表");
    }
    if(ids?.length){
      for(let id of ids) {
        tables.push(await CacheService.getTableById(id))
      }
    }
  }
  return {
    msg: '导出成功',
    action: 'download',
    data: {
      tables
    }
  }
}

export async function syncTable({ ids, id: tableId, user }) {
  if (tableId) {
    await CacheService.reloadTableById(tableId)
    const table = await CacheService.getTableById(tableId);
    const Model = await DynamicDataService.getModelForTable(
      table.name,
      user.tenantId
    );
    await Model.sync({ alter: true });
    await CacheService.reloadTable(table.alias_name);
  } else {
    if (ids.length === 0) {
      throw new Error("请至少选择一个数据表");
    }
    await CacheService.reloadTableByIds(ids)
    for (const id of ids) {
      const table = await CacheService.getTableById(id);
      const Model = await DynamicDataService.getModelForTable(
        table.name,
        user.tenantId
      );
      await Model.sync({ alter: true });
      await CacheService.reloadTable(table.alias_name);
    }
  }
  return {
    message: "数据表同步成功",
  };
}

export async function getPageConfig({ tableName }) {
  return await getTableConfig(tableName);
}

export async function getTableConfig(tableName) {
  const table = await CacheService.getTableByAliasName(tableName);
  if (!table) {
    throw new AppError("Table not found", 404);
  }
  return getTableConfigById(table.id);
}

export async function getTableConfigById(tableId: number) {
  const table = await CacheService.getTableById(tableId);
  if (!table) {
    throw new AppError("Table not found", 404);
  }
  const columns = [...table.columns].sort((a, b) => a.orderno - b.orderno);

  const relatedTables = {};
  for (const col of columns) {
    if (col.relatedToTableId) {
      const relatedTable = await CacheService.getTableById(
        col.relatedToTableId
      );
      if (relatedTable) {
        relatedTables[col.relatedToTableId] =
          relatedTable.alias_name || relatedTable.name;
      }
    }
  }

  const actions = [...table.actions].sort((a, b) => a.orderno - b.orderno);

  return {
    id: table.id,
    table: table.alias_name || table.name,
    name: table.description,
    hideMenu: table.hideMenu,
    defaultSort: table.defaultSort,
    actions,
    columns: columns.map((col) => {
      let rules = col.ui.rules || (col.required ? 'required' : null);
      return {
        id: col.id,
        fieldName: col.name,
        label: col.description,
        ak: col.ak,
        dk: col.dk,
        required: col.required,
        sortable: col.sortable,
        dataType: col.dataType,
        defaultValue: getDefaultValue(col),
        relatedToTableId: col.relatedToTableId,
        relatedToTableName: relatedTables[col.relatedToTableId],
        rules,
        ...col.ui,
      };
    }),
  };
}
