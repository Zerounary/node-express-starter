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
        },
        name: 'SystemTable',
        path: '/system/table',
        component: () => import('#/views/system/table/index.vue'),
      },
      {
        meta: {
          title: $t('system.column.name'),
        },
        name: 'SystemColumn',
        path: '/system/column',
        component: () => import('#/views/system/column/index.vue'),
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
    meta: { title: '...', hideInMenu: true },
    name: 'Crud',
    path: 'crud/:table',
    component: () => import('#/views/system/crud/index.vue'),
  },
];

export default routes;
