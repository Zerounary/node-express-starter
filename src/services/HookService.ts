import { readdir } from 'fs/promises';
import { join } from 'path';

class HookService {
  private hooks: Map<string, any> = new Map();

  constructor() {
    this.loadHooks();
  }

  private async loadHooks() {
    try {
      const hooksDir = join(__dirname, '../hooks');
      const files = await readdir(hooksDir);
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          const tableName = file.split('.')[0];
          const module = await import(join(hooksDir, file));
          this.hooks.set(tableName, module);
        }
      }
    } catch (error) {
        // 如果hooks目录不存在，则忽略
      if (error.code !== 'ENOENT') {
        console.error('Failed to load hooks:', error);
      }
    }
  }

  public async executeHook(tableName: string, hookName: string, ...args: any[]) {
    // 1. 执行全局钩子
    const globalHooks = this.hooks.get('_global');
    let [id, data] = args;
    if (globalHooks && typeof globalHooks[hookName] === 'function') {
      const result = await globalHooks[hookName](...args);
      if (result) {
        data = result
      }
    }
    
    // 2. 执行特定于表的钩子
    const tableHooks = this.hooks.get(tableName);
    if (tableHooks && typeof tableHooks[hookName] === 'function') {
      const result = await tableHooks[hookName](...[id, data]);
      if (result) {
        data = result;
      }
    }

    // `DynamicController` 期望钩子返回被修改的对象
    if (hookName.startsWith('before')) {
      return data;
    }
  }
}

export default new HookService(); 