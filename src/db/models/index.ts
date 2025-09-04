import DynamicTable from './DynamicTable';
import TableCategory from './TableCategory';
import Tenant from './Tenant';
import DynamicColumn from './DynamicColumn';
import Media from './Media';
import MediaCategory from './MediaCategory';
import setupAssociations from './associations';
import { TableAction } from './TableAction';

// 设置模型之间的关联关系
setupAssociations();

export {
  DynamicTable,
  DynamicColumn,
  TableCategory,
  Tenant,
  Media,
  MediaCategory,
  TableAction,
};