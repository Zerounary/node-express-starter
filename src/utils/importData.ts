export async function importTableData(tableName:string, data: any, parentId?: number, parentKey?: string) {
    // { name: "a", items: [ { name: "",  } ] }
    console.log('tableName', tableName, parentKey, parentId, JSON.stringify(data))
}