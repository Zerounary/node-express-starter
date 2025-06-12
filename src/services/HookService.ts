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
    // req 对象是最后一个参数
    const req = args[args.length - 1];

    // 1. 执行全局钩子
    const globalHooks = this.hooks.get('_global');
    if (globalHooks && typeof globalHooks[hookName] === 'function') {
      const result = await globalHooks[hookName](...args);
      if (result) {
        args[0] = result;
      }
    }
    
    // 2. 执行特定于表的钩子
    const tableHooks = this.hooks.get(tableName);
    if (tableHooks && typeof tableHooks[hookName] === 'function') {
      const result = await tableHooks[hookName](...args);
      if (result) {
        args[0] = result;
      }
    }

    return args[0];
  }
}

export default new HookService(); 