import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { $t } from '#/locales';
import { applyDependencies } from '#/utils';
import { useAccess } from '@vben/access';
const { hasAccessByTable } = useAccess();

export const isCreateVisable = (col) => col.mask?.charAt(0) == '1';
export const isCreateEditable = (col) => col.mask?.charAt(1) == '1';
export const isUpdateVisable = (col) => col.mask?.charAt(2) == '1';
export const isUpdateEditable = (col) => col.mask?.charAt(3) == '1';
export const isListVisable = (col) => col.mask?.charAt(4) == '1';
export const isFilterVisable = (col) => col.mask?.charAt(5) == '1';


export function useFormCreateSchema(table, { formApi, data }): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .filter(isCreateVisable)
    .map(mapToCreateSchemaColumn)
    .map(col => applyDependencies(col)) // Apply dependencies
    .map(enhanceComponentProps(formApi, data));
  console.log('🚀 ~ useFormCreateSchema ~ dynColumns:', dynColumns);
  return [...dynColumns];
}

export function useFormUpdateSchema(table, { formApi, data }): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .filter(isUpdateVisable)
    .map(mapToUpdateSchemaColumn)
    .map(col => applyDependencies(col)) // Apply dependencies
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
  let component = isCreateEditable(col) ? col.component : 'Text';
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

  let options = ['update', 'delete'].filter(perm => {
    return hasAccessByTable(table.table, perm)
  });
  return [
    ...dynColumns,
    ...(options.length ? [{
      align: 'center',
      cellRender: {
        options,
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
    }] : [])
  ];
}
