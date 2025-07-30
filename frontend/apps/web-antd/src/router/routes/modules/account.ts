import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'tabler:user',
      keepAlive: true,
      order: 1000,
      title: $t('account.title'),
    },
    name: 'Account',
    path: '/account',
    children: [
      {
        meta: {
          title: $t('account.user.name'),
          dyn: true,
          table: 'users',
        },
        name: 'AccountUsers',
        path: '/account/users',
        component: () => import('#/views/system/crud/index.vue'),
      },
      {
        meta: {
          title: $t('account.role.name'),
          dyn: true,
          table: 'roles',
        },
        name: 'AcountRoles',
        path: '/account/roles',
        component: () => import('#/views/system/crud/index.vue'),
      },
    ],
  }
];

export default routes;
