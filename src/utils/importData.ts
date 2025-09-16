import CacheService from "@/services/CacheService";
import DynamicService from "@/services/DynamicService";

export async function importTableData(
  tableAliasName: string,
  data: any[],
  user: any,
  parentId?: number,
  parentKey?: string
) {
  // { name: "a", items: [ { name: "",  } ] }
  console.log(
    "tableName",
    tableAliasName,
    parentKey,
    parentId,
    JSON.stringify(data)
  );
  if (data.length > 0) {
    let table = await CacheService.getTableByAliasName(tableAliasName);
    const tabs = table.columns.find((e) => e.ui?.component == "Items")?.ui
      ?.componentProps?.tabs;
    for (let item of data) {
      let row = await DynamicService.create(
        tableAliasName,
        {
          ...item,
          [parentKey]: parentId,
        },
        user
      );
      for (let tab of tabs) {
        if (item[tab.table]?.length > 0) {
          // let itemTable = await CacheService.getTableByAliasName(tab.table)
          for (let tabItem of item[tab.table]) {
            await DynamicService.create(
              tab.table,
              {
                ...tabItem,
                // @ts-expect-error
                [tab.parentKey]: row.id,
              },
              user
            );
          }
        }
      }
    }
  }
}
