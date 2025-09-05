import { buildZodSchemaFromRules } from '#/adapter/component/zod-rules-builder';
import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemTableApi } from '#/api';

import { $t } from '#/locales';
import { applyDependencies } from '#/utils';
import { useAccess } from '@vben/access';

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
    .map(col => columnRulesInit(col))
    .map(enhanceComponentProps(formApi, data));
  return [...dynColumns];
}

export function useFormUpdateSchema(table, { formApi, data }): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .filter(isUpdateVisable)
    .map(mapToUpdateSchemaColumn)
    .map(col => applyDependencies(col)) // Apply dependencies
    .map(col => columnRulesInit(col))
    .map(enhanceComponentProps(formApi, data));
  return [...dynColumns];
}

const columnRulesInit = (col) => {
  // 如果col.rules不是数组，直接返回
  if(!Array.isArray(col.rules)) return col;
  let rules = buildZodSchemaFromRules(col.rules, col.defaultValue);
  return  {
    ...col,
    rules,
  }
}

const wrappItemClass = (col, component) => {
  if(['Items', 'MetaInput', 'UIInput', 'Divider'].includes(component)) {
    col.formItemClass = col.formItemClass || 'col-span-1 md:col-span-2 lg:col-span-4'
    col.hideLabel = true;
    if(component === 'Divider') {
      col.componentProps = {
        ...col.componentProps,
        label: col.label,
      }
    }
  }
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
  let component = col.component;
  if(!isUpdateEditable(col) && component !== 'Divider') {
    component = 'Text';
  }
  wrappItemClass(col, component);
  return {
    ...col,
    component,
  };
};

const mapToCreateSchemaColumn = (col) => {
  let component = col.component;
  if(!isCreateEditable(col) && component !== 'Divider') {
    component = 'Text';
  }
  wrappItemClass(col, component);
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
  rules: null,
  fieldName: col.filterOp ? `${col.fieldName}-${col.filterOp}` : col.fieldName,
});

export function useGridFormSchema(table): VbenFormSchema[] {
  const dynColumns = (table.columns || [])
    .filter(isFilterVisable)
    .map(mapToListSchemaColumn)
    .map(mapToOpFilterColumn);
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

  const { hasAccessByTable } = useAccess();
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
