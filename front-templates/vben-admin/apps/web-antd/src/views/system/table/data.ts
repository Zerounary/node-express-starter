import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'table',
      help: $t('system.table.tableHelp'),
      label: $t('system.table.table'),
      rules: z.string().regex(/^[a-z_]\w{0,63}$/i, {
        message: $t('system.table.tableRegexTip'),
      }),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.table.tableName'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      fieldName: 'subTitle',
      label: $t('system.table.subTitle'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('common.enabled'), value: 1 },
          { label: $t('common.disabled'), value: 0 },
        ],
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('system.status'),
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'table',
      label: $t('system.table.table'),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.table.tableName'),
    },
    {
      component: 'RangePicker',
      fieldName: 'createTime',
      label: $t('system.table.createTime'),
    },
  ];
}

export function useColumns<T = SystemTableApi.SystemTable>(
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'table',
      title: $t('system.table.table'),
      width: 200,
    },
    {
      field: 'name',
      title: $t('system.table.tableName'),
      width: 200,
    },
    {
      field: 'subTitle',
      minWidth: 100,
      title: $t('system.table.subTitle'),
    },
    {
      field: 'createTime',
      title: $t('system.table.createTime'),
      width: 200,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.table.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.table.operation'),
      width: 130,
    },
  ];
}
