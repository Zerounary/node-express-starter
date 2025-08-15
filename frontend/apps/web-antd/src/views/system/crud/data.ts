import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { $t } from '#/locales';

const isCreateVisable = (col) => col.mask?.charAt(0) == '1';
const isCreateEditable = (col) => col.mask?.charAt(1) == '1';
const isUpdateVisable = (col) => col.mask?.charAt(2) == '1';
const isUpdateEditable = (col) => col.mask?.charAt(3) == '1';
const isListVisable = (col) => col.mask?.charAt(4) == '1';
const isFilterVisable = (col) => col.mask?.charAt(5) == '1';

export function useFormCreateSchema(table, { formApi, data}): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .filter(isCreateVisable)
    .map(mapToCreateSchemaColumn)
    .map(enhanceComponentProps(formApi, data));
  console.log('🚀 ~ useFormCreateSchema ~ dynColumns:', dynColumns);
  return [...dynColumns];
}

export function useFormUpdateSchema(table, { formApi, data}): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .filter(isUpdateVisable)
    .map(mapToUpdateSchemaColumn)
    .map(enhanceComponentProps(formApi, data));
  console.log('🚀 ~ useFormUpdateSchema ~ dynColumns:', dynColumns);
  return [...dynColumns];
}

const enhanceComponentProps = (formApi, data) => {
  const fn = (col) => {
    return {
      ...col,
      componentProps: {
        ...col.componentProps,
        formApi,
        row: data,
      },
    };
  };
    return fn;
  };

const mapToUpdateSchemaColumn = (col) => {
  console.log("🚀 ~ mapToUpdateSchemaColumn ~ col:", col)
  let component = isUpdateEditable(col) ? col.component : 'Text';
  return {
    ...col,
    component,
  };
};

const mapToCreateSchemaColumn = (col) => {
  return {
    ...col,
    component,
  };
};

const mapToListSchemaColumn = (col) => {
  return {
    ...col,
  };
};

const mapToGridColumn = (col) => {
    console.log('🚀 ~ mapToGridColumn ~ col:', col)
    return ({
        cellRender: {
            name: 'CellText', props: {
                schema: col,
            }
        },
        ...col,
        field: col.fieldName,
        title: col.label,
    });
};

const mapToOpFilterColumn = (col) => ({
  ...col,
  fieldName: col.filterOp ? `${col.fieldName}-${col.filterOp}` : col.fieldName,
});

export function useGridFormSchema(table): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .filter(isFilterVisable)
    .map(mapToListSchemaColumn)
    .map(mapToOpFilterColumn);
  console.log('🚀 ~ useGridFormSchema ~ dynColumns:', dynColumns);
  return [...dynColumns];
}

export function useColumns<T = SystemTableApi.SystemTable>(
  table,
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  const dynColumns = (table.columns || [])
    .filter(isListVisable)
    .map(mapToGridColumn);
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
