import DynamicTable from './DynamicTable';
import TableCategory from './TableCategory';
import Tenant from './Tenant';
import DynamicColumn from './DynamicColumn';
import setupAssociations from './associations';

// 设置模型之间的关联关系
setupAssociations();

export {
  DynamicTable,
  DynamicColumn,
  TableCategory,
  Tenant,
};