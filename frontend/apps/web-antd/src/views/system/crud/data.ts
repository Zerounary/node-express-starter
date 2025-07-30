import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';
import { getPage } from '#/api/system/crud';

import { $t } from '#/locales';

const isCreateVisable = (col) => col.mask?.charAt(0) == '1';
const isUpdateVisable = (col) => col.mask?.charAt(2) == '1';
const isListVisable = (col) => col.mask?.charAt(4) == '1';
const isFilterVisable = (col) => col.mask?.charAt(5) == '1';

export function useFormCreateSchema(table): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .map(mapToSchemaColumn)
    .filter(isCreateVisable);
  console.log('🚀 ~ useFormCreateSchema ~ dynColumns:', dynColumns)
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

export function useFormUpdateSchema(table): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .map(mapToSchemaColumn)
    .filter(isUpdateVisable);
  console.log('🚀 ~ useFormUpdateSchema ~ dynColumns:', dynColumns)
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

const mapToOpFilterColumn = (col) => ({
  ...col,
  fieldName: col.filterOp ? `${col.fieldName}-${col.filterOp}` : col.fieldName,
});

export function useGridFormSchema(table): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .map(mapToSchemaColumn)
    .map(mapToOpFilterColumn)
    .filter(isFilterVisable);
  console.log('🚀 ~ useGridFormSchema ~ dynColumns:', dynColumns);
  return [
    ...dynColumns,
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
  const dynColumns = (table.columns || [])
    .map(mapToGridColumn)
    .filter(isListVisable);
  console.log('🚀 ~ dynColumns:', dynColumns);
  return [
    ...dynColumns,
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
