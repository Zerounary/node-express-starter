import { DynamicTable, DynamicColumn } from '../db/models';
import { logError, logInfo } from '../logger';

class CacheService {
    private tableCacheByName: Map<string, DynamicTable> = new Map();
    private tableCacheByAliasName: Map<string, DynamicTable> = new Map();
    private tableCacheById: Map<number, DynamicTable> = new Map();

    public async initialize() {
        logInfo('Initializing schema cache...');
        await this.loadAllTables();
        logInfo('Schema cache initialized.');
    }

    public async loadAllTables() {
        try {
            const tables = await DynamicTable.findAll({
                include: [{ model: DynamicColumn, as: 'columns' }]
            });

            const newTableCacheByName = new Map<string, DynamicTable>();
            const newTableCacheByAliasName = new Map<string, DynamicTable>();
            const newTableCacheById = new Map<number, DynamicTable>();

            for (const table of tables) {
                const tableData = table.get({ plain: true }) as DynamicTable & { columns: DynamicColumn[] };
                newTableCacheByName.set(tableData.name, tableData);
                newTableCacheByAliasName.set(tableData.alias_name, tableData);
                newTableCacheById.set(tableData.id, tableData);
            }

            this.tableCacheByName = newTableCacheByName;
            this.tableCacheByAliasName = newTableCacheByAliasName;
            this.tableCacheById = newTableCacheById;
            logInfo('All dynamic tables and columns have been cached.');
        } catch (error) {
            logError(error);
            throw error;
        }
    }

    public async reloadTable(tableName: string) { // Expects physical table name
        try {
            const oldData = this.tableCacheByName.get(tableName);
            if (oldData) {
                this.tableCacheByAliasName.delete(oldData.alias_name);
                this.tableCacheById.delete(oldData.id);
            }

            const table = await DynamicTable.findOne({
                where: { name: tableName },
                include: [{ model: DynamicColumn, as: 'columns' }]
            });

            if (!table) {
                this.tableCacheByName.delete(tableName);
                logInfo(`Table ${tableName} not found, removed from cache.`);
                return;
            }

            const tableData = table.get({ plain: true }) as DynamicTable & { columns: DynamicColumn[] };
            this.tableCacheByName.set(tableData.name, tableData);
            this.tableCacheByAliasName.set(tableData.alias_name, tableData);
            this.tableCacheById.set(tableData.id, tableData);
            logInfo(`Cache reloaded for table: ${tableName}`);
        } catch (error) {
            logError(error);
            throw error;
        }
    }

    public getTableByName(name: string): (DynamicTable & { columns: DynamicColumn[] }) | undefined {
        return this.tableCacheByName.get(name) as any;
    }
    
    public getTableByAliasName(aliasName: string): (DynamicTable & { columns: DynamicColumn[] }) | undefined {
        return this.tableCacheByAliasName.get(aliasName) as any;
    }

    public getTableById(id: number): (DynamicTable & { columns: DynamicColumn[] }) | undefined {
        return this.tableCacheById.get(id) as any;
    }
}

export default new CacheService();