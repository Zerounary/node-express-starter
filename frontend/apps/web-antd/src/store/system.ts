import type { SystemColumnApi, SystemMenuApi, SystemTableApi } from '#/api';

import dayjs from 'dayjs';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';

import { resetRoutes } from '#/router';

const clone = (obj: any) => {
  return JSON.parse(JSON.stringify(obj));
};

export const useSystem = defineStore('system', {
  state: () => ({
    tables: [] as SystemTableApi.SystemTable[],
    columns: [] as SystemColumnApi.SystemColumn[],
    menus: [] as SystemMenuApi.SystemMenu[],
  }),
  getters: {
    table() {
      return (name: string) => {
        const table = this.tables.find((item) => item.table === name);
        const columns = this.columns.filter((item) => item.table === name);
        return table
          ? {
              ...table,
              columns,
            }
          : null;
      };
    },
  },
  actions: {
    applyMenu() {
      console.log('🚀 ~ applyMenu ~ applyMenu:', clone(this.menus));
      resetRoutes(clone(this.menus));
      // for (const menu of this.menus) {
      //   router.addRoute(menu);
      // }
    },
    addMenu(menu: Omit<SystemMenuApi.SystemMenu, 'id'>) {
      console.log('🚀 ~ addMenu ~ menu:', JSON.stringify(menu));
      // 深度的引用meta会引发无法缓存问题
      // menu = clone(menu);
      // 如果 menu.pid 不存在
      if (menu.pid) {
        // 递归遍历menus, 找到pid对应的菜单
        const findMenu = (menus: SystemMenuApi.SystemMenu[]) => {
          for (const item of menus) {
            if (item.id === menu.pid) {
              menu.id = uuid();
              menu.createTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
              item.children.push(menu);
              return true;
            }
            if (item.children) {
              const found = findMenu(item.children);
              if (found) return true;
            }
          }
          return false;
        };
        const found = findMenu(this.menus);
        if (!found) {
          // 如果没有找到pid对应的菜单, 就添加到根菜单
          menu.id = uuid();
          menu.createTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
          menu.children = [];
          this.menus.push(menu);
        }
      } else {
        menu.id = uuid();
        menu.createTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
        menu.children = [];
        this.menus.push(menu);
      }
    },
    updateMenu(id: string, menu: Omit<SystemMenuApi.SystemMenu, 'id'>) {
      console.log('🚀 ~ updateMenu ~ id:', id);
      const updateMenu = (menus: SystemMenuApi.SystemMenu[]) => {
        for (const item of menus) {
          if (item.id === id) {
            // 遍历menu的key 更新item
            for (const key in menu) {
              if (key !== 'id' && key !== 'children') {
                item[key] = menu[key];
              }
            }
            item.updateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
            return true;
          }
          if (item.children) {
            const found = updateMenu(item.children);
            if (found) return true;
          }
        }
        return false;
      };
      updateMenu(this.menus);

      console.log(this.menus);
    },
    removeMenu(id: string) {
      const index = this.menus.findIndex((item) => item.id === id);
      if (index !== -1) {
        this.menus.splice(index, 1);
      }
    },
    addColumn(column: Omit<SystemColumnApi.SystemColumn, 'id'>) {
      column.id = uuid();
      column.createTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      this.columns.push(column);
    },
    updateColumn(id: string, column: Omit<SystemColumnApi.SystemColumn, 'id'>) {
      const index = this.columns.findIndex((item) => item.id === id);
      if (index !== -1) {
        this.columns[index] = { ...this.columns[index], ...column };
      }
    },
    removeColumn(id: string) {
      const index = this.columns.findIndex((item) => item.id === id);
      if (index !== -1) {
        this.columns.splice(index, 1);
      }
    },
    addTable(table: Omit<SystemTableApi.SystemTable, 'id'>) {
      table.id = uuid();
      table.createTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      this.tables.push(table);
    },
    updateTable(id: string, table: Omit<SystemTableApi.SystemTable, 'id'>) {
      const index = this.tables.findIndex((item) => item.id === id);
      if (index !== -1) {
        this.tables[index] = { ...this.tables[index], ...table };
      }
    },
    removeTable(id: string) {
      const index = this.tables.findIndex((item) => item.id === id);
      if (index !== -1) {
        this.tables.splice(index, 1);
      }
    },
  },
  persist: true,
});
