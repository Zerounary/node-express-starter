import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 1000,
      title: $t('system.title'),
    },
    name: 'System',
    path: '/system',
    children: [
      {
        meta: {
          title: $t('system.table.name'),
          dyn: true,
          table: 'table',
        },
        name: 'SystemTable',
        path: '/system/table',
        component: () => import('#/views/system/crud/index.vue'),
      },
      {
        meta: {
          title: $t('system.column.name'),
          dyn: true,
          table: 'column',
        },
        name: 'SystemColumn',
        path: '/system/column',
        component: () => import('#/views/system/crud/index.vue'),
      },
      {
        meta: {
          // icon: 'mdi:menu',
          title: $t('system.menu.title'),
        },
        path: '/system/menu',
        name: 'SystemMenu',
        component: () => import('#/views/system/menu/list.vue'),
      },
    ],
  },
  {
    meta: { title: '...', hideInMenu: true, dyn: true },
    name: 'Crud',
    path: 'crud/:table',
    component: () => import('#/views/system/crud/index.vue'),
  },
];

export default routes;
