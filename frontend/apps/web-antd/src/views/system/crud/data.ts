import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { $t } from '#/locales';

export function useFormSchema(table): VbenFormSchema[] {
  const dynColumns = (table.columns || []).map(mapToSchemaColumn);
  return [
    ...dynColumns,
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

const mapToSchemaColumn = (col) => ({
  ...col,
});

const mapToGridColumn = (col) => ({
  ...col,
  field: col.fieldName,
  title: col.label,
});

export function useGridFormSchema(table): VbenFormSchema[] {
  const dynColumns = (table.columns || []).map(mapToSchemaColumn);
  console.log('🚀 ~ useGridFormSchema ~ dynColumns:', dynColumns);
  return [
    ...dynColumns.filter(col => col.mask.charAt(4) == '1'),
    {
      component: 'RangePicker',
      fieldName: 'createTime',
      label: $t('system.table.createTime'),
    },
  ];
}

export function useColumns<T = SystemTableApi.SystemTable>(
  table,
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  const dynColumns = (table.columns || []).map(mapToGridColumn);
  console.log('🚀 ~ dynColumns:', dynColumns);
  return [
    ...dynColumns.filter(col => col.mask.charAt(0) == '1'),
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
