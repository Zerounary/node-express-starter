import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'fieldName',
      help: $t('system.column.fieldHelp'),
      label: $t('system.column.field'),
      rules: z.string().regex(/^[a-z_]\w{0,63}$/i, {
        message: $t('system.column.columnRegexTip'),
      }),
    },
    {
      component: 'Input',
      fieldName: 'label',
      label: $t('system.column.columnName'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'table',
      label: $t('system.column.table'),
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'component',
      label: $t('system.column.component'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      fieldName: 'subTitle',
      label: $t('system.column.subTitle'),
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
      fieldName: 'fieldName',
      label: $t('system.column.field'),
    },
    {
      component: 'Input',
      fieldName: 'label',
      label: $t('system.column.columnName'),
    },
    {
      component: 'Input',
      fieldName: 'table',
      label: $t('system.column.table'),
    },
    {
      component: 'RangePicker',
      fieldName: 'createTime',
      label: $t('system.column.createTime'),
    },
  ];
}

export function useColumns<T = SystemTableApi.SystemTable>(
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'fieldName',
      title: $t('system.column.field'),
      width: 200,
    },
    {
      field: 'label',
      title: $t('system.column.columnName'),
      width: 200,
    },
    {
      field: 'table',
      title: $t('system.column.table'),
      width: 200,
    },
    {
      field: 'createTime',
      title: $t('system.column.createTime'),
      width: 200,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.column.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.column.operation'),
      width: 130,
    },
  ];
}
