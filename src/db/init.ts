import { DynamicColumn, DynamicTable } from "./models";

export const systemTables = [
    {
        name: 'dynamic_tables',
        description: '表',
        alias_name: 'table',
        columns: [
            { name: 'name', dataType: 'STRING', required: true, description: '表', relationshipType: undefined, relatedToTableId: undefined, enumValues: undefined },
            { name: 'description', dataType: 'STRING', required: true, description: '描述', relationshipType: undefined, relatedToTableId: undefined, enumValues: undefined },
        ]
    }
]

export const initSystemData = async () => {
    for (const table of systemTables) {
        const exists = await DynamicTable.findOne({ where: { name: table.name }});
        let tableId = exists?.id;
        if (!exists) {
            // 创建表
            let tableRow = await DynamicTable.create({
                tenantId: 1,
                name: table.name,
                alias_name: table.alias_name,
                description: table.description,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            tableId = tableRow.id;
        } else {
            await DynamicTable.update(table, { where: { id: tableId } });
        }

        // 初始化列
        for (const column of table.columns) {
            const existsColumn = await DynamicColumn.findOne({ where: { name: column.name, tableId } });
            if (!existsColumn) {
                await DynamicColumn.create({
                    tenantId: 1,
                    name: column.name,
                    dataType: column.dataType,
                    tableId,
                    description: column.description,
                    relationshipType: column?.relationshipType,
                    relatedToTableId: column?.relatedToTableId,
                    enumValues: column?.enumValues,
                });
            } else {
                await DynamicColumn.update(column, { where: { name: column.name } });
            }
        }
    }
}