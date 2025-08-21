import { DynamicTable, DynamicColumn } from '../db/models';
import { logError, logInfo } from '../logger';

class CacheService {
    private tableCacheByName: Map<string, DynamicTable> = new Map();
    private tableCacheByAliasName: Map<string, DynamicTable> = new Map();
    private tableCacheById: Map<number, DynamicTable> = new Map();

    // User Permissions Cache
    private userPermissionsCache: Map<number, Set<string>> = new Map();
    // User Data Scopes Cache
    private userDataScopesCache: Map<string, any> = new Map();

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

    // --- User Permission Cache Methods ---
    public getPermissions(userId: number): Set<string> | undefined {
        return this.userPermissionsCache.get(userId);
    }

    public setPermissions(userId: number, permissions: Set<string>): void {
        this.userPermissionsCache.set(userId, permissions);
        logInfo(`Permissions cached for user: ${userId}`);
    }

    // --- User Data Scope Cache Methods ---
    public getDataScope(userId: number, resource: string): any | undefined {
        const key = `${userId}:${resource}`;
        return this.userDataScopesCache.get(key);
    }

    public setDataScope(userId: number, resource: string, scope: any): void {
        const key = `${userId}:${resource}`;
        this.userDataScopesCache.set(key, scope);
        logInfo(`Data scope cached for user ${userId} on resource ${resource}`);
    }
    
    // --- General User Cache Method ---
    public clearUserCache(userId: number): void {
        this.userPermissionsCache.delete(userId);

        const prefix = `${userId}:`;
        for (const key of this.userDataScopesCache.keys()) {
            if (key.startsWith(prefix)) {
                this.userDataScopesCache.delete(key);
            }
        }
        logInfo(`All caches cleared for user: ${userId}`);
    }
}

export default new CacheService();
