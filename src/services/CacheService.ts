import { DynamicTable, DynamicColumn } from '../db/models';
import { logError, logInfo } from '../logger';

type TableWithColumns = DynamicTable & { columns: DynamicColumn[] };

function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
  if (obj && typeof obj === 'object') {
    const o = obj as unknown as object;
    if (seen.has(o)) return obj;
    seen.add(o);
    // @ts-ignore
    const props = Array.isArray(o) ? o : Object.values(o);
    for (const v of props) deepFreeze(v as any, seen);
    Object.freeze(o);
  }
  return obj;
}

class CacheService {
  // 全局开关：默认开启，设置 CACHE_ENABLED=false 可关闭
  private enabled = process.env.CACHE_ENABLED !== 'false';

  // 原子快照，避免多 Map 更新时的中间态
  private tables: {
    byName: Map<string, TableWithColumns>;
    byAlias: Map<string, TableWithColumns>;
    byId: Map<number, TableWithColumns>;
  } = {
    byName: new Map(),
    byAlias: new Map(),
    byId: new Map(),
  };

  // 针对 reloadTable 的按表名串行队列，避免并发覆盖
  private reloadQueue = new Map<string, Promise<void>>();

  // User caches
  private userPermissionsCache: Map<number, Set<string>> = new Map();
  private userDataScopesCache: Map<string, any> = new Map();

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(v: boolean): void {
    if (this.enabled === v) return;
    this.enabled = v;
    logInfo(`CacheService enabled=${v}`);
    if (!v) {
      this.clearAll();
    }
  }

  public clearAll(): void {
    this.tables = { byName: new Map(), byAlias: new Map(), byId: new Map() };
    this.userPermissionsCache.clear();
    this.userDataScopesCache.clear();
    logInfo('CacheService cleared all caches.');
  }

  public async initialize() {
    logInfo('Initializing schema cache...');
    if (!this.enabled) {
      logInfo('Cache disabled, skip preloading schema cache.');
      return;
    }
    await this.loadAllTables();
    logInfo('Schema cache initialized.');
  }

  public async loadAllTables() {
    if (!this.enabled) return;
    try {
      const tables = await DynamicTable.findAll({
        include: [{ model: DynamicColumn, as: 'columns' }],
      });

      const byName = new Map<string, TableWithColumns>();
      const byAlias = new Map<string, TableWithColumns>();
      const byId = new Map<number, TableWithColumns>();

      for (const table of tables) {
        const tableData = table.get({ plain: true }) as unknown as TableWithColumns;
        const frozen = deepFreeze(tableData);
        // @ts-ignore name/alias_name/id 由模型定义
        byName.set((frozen as any).name, frozen);
        // @ts-ignore
        byAlias.set((frozen as any).alias_name, frozen);
        // @ts-ignore
        byId.set((frozen as any).id, frozen);
      }

      // 原子替换快照
      this.tables = { byName, byAlias, byId };
      logInfo('All dynamic tables and columns have been cached.');
    } catch (error) {
      logError(error);
      throw error;
    }
  }

  private enqueueReload(key: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.reloadQueue.get(key) || Promise.resolve();
    const next = prev
      .then(fn)
      .catch((e) => {
        logError(e);
      })
      .finally(() => {
        // 仅当链到当前 next 时删除，避免竞态
        if (this.reloadQueue.get(key) === next) this.reloadQueue.delete(key);
      });
    this.reloadQueue.set(key, next);
    return next;
  }

  // Expects physical table name
  public async reloadTable(tableName: string) {
    if (!this.enabled) return;
    return this.enqueueReload(tableName, async () => {
      try {
        const table = await DynamicTable.findOne({
          where: { name: tableName },
          include: [{ model: DynamicColumn, as: 'columns' }],
        });

        const current = this.tables;
        const byName = new Map(current.byName);
        const byAlias = new Map(current.byAlias);
        const byId = new Map(current.byId);

        if (!table) {
          const old = byName.get(tableName) as any;
          if (old) {
            byAlias.delete(old.alias_name);
            byId.delete(old.id);
            byName.delete(tableName);
          }
          this.tables = { byName, byAlias, byId };
          logInfo(`Table ${tableName} not found, removed from cache.`);
          return;
        }

        const tableData = table.get({ plain: true }) as unknown as TableWithColumns;
        const frozen = deepFreeze(tableData) as any;

        const old = byName.get(tableName) as any;
        if (old) {
          byAlias.delete(old.alias_name);
          byId.delete(old.id);
        }

        byName.set(frozen.name, frozen);
        byAlias.set(frozen.alias_name, frozen);
        byId.set(frozen.id, frozen);

        this.tables = { byName, byAlias, byId };
        logInfo(`Cache reloaded for table: ${tableName}`);
      } catch (error) {
        logError(error);
        throw error;
      }
    });
  }

  public async getTableByName(name: string): Promise<TableWithColumns | undefined> {
    if (this.enabled) {
      return this.tables.byName.get(name);
    }
    logInfo(`Cache disabled, fetching table by name '${name}' from DB.`);
    const table = await DynamicTable.findOne({
      where: { name },
      include: [{ model: DynamicColumn, as: 'columns' }],
    });
    return table ? (table.get({ plain: true }) as TableWithColumns) : undefined;
  }

  public async getTableByAliasName(aliasName: string): Promise<TableWithColumns | undefined> {
    if (this.enabled) {
      return this.tables.byAlias.get(aliasName);
    }
    logInfo(`Cache disabled, fetching table by alias name '${aliasName}' from DB.`);
    const table = await DynamicTable.findOne({
      where: { alias_name: aliasName },
      include: [{ model: DynamicColumn, as: 'columns' }],
    });
    return table ? (table.get({ plain: true }) as TableWithColumns) : undefined;
  }

  public async getTableById(id: number): Promise<TableWithColumns | undefined> {
    if (this.enabled) {
      return this.tables.byId.get(id);
    }
    logInfo(`Cache disabled, fetching table by id ${id} from DB.`);
    const table = await DynamicTable.findOne({
      where: { id },
      include: [{ model: DynamicColumn, as: 'columns' }],
    });
    return table ? (table.get({ plain: true }) as TableWithColumns) : undefined;
  }

  // --- User Permission Cache Methods ---
  public async getPermissions(userId: number): Promise<Set<string> | undefined> {
    if (this.enabled) {
      const val = this.userPermissionsCache.get(userId);
      return val ? new Set(val) : undefined; // 返回副本，避免外部修改内部 Set
    }

    logInfo(`Cache disabled, fetching permissions for user ${userId} from DB.`);
    try {
      // Dynamic import to prevent circular dependencies
      const { default: permissionService } = await import('./PermissionService');
      // Assuming PermissionService has a method to compute permissions without caching
      return await permissionService.computeUserPermissions(userId);
    } catch (error) {
      logError(error);
      return new Set<string>(); // Return empty set on error to avoid breaking consumers
    }
  }

  public setPermissions(userId: number, permissions: Set<string>): void {
    if (!this.enabled) return;
    // 存储副本，避免引用被外部持有后修改
    this.userPermissionsCache.set(userId, new Set(permissions));
    logInfo(`Permissions cached for user: ${userId}`);
  }

  // --- User Data Scope Cache Methods ---
  public async getDataScope(userId: number, resource: string): Promise<any | undefined> {
    if (this.enabled) {
      const key = `${userId}:${resource}`;
      return this.userDataScopesCache.get(key);
    }

    logInfo(`Cache disabled, fetching data scope for user ${userId} on resource ${resource} from DB.`);
    try {
      // Dynamic import to prevent circular dependencies
      const { default: dataScopeService } = await import('./DataScopeService');
      // Assuming DataScopeService has a method to compute scope without caching
      return await dataScopeService.computeDataScope(userId, resource);
    } catch (error) {
      logError(error);
      return undefined; // Return undefined on error
    }
  }

  public setDataScope(userId: number, resource: string, scope: any): void {
    if (!this.enabled) return;
    const key = `${userId}:${resource}`;
    // 存入冻结对象，降低误改风险
    const val = typeof scope === 'object' && scope !== null ? deepFreeze(scope) : scope;
    this.userDataScopesCache.set(key, val);
    logInfo(`Data scope cached for user ${userId} on resource ${resource}`);
  }

  // --- General User Cache Method ---
  public clearUserCache(userId: number): void {
    if (!this.enabled) return;
    this.userPermissionsCache.delete(userId);

    const prefix = `${userId}:`;
    for (const key of Array.from(this.userDataScopesCache.keys())) {
      if (key.startsWith(prefix)) {
        this.userDataScopesCache.delete(key);
      }
    }
    logInfo(`All caches cleared for user: ${userId}`);
  }
}

export default new CacheService();