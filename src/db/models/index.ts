import DynamicTable from './DynamicTable';
import DynamicColumn from './DynamicColumn';

// 设置关联关系
DynamicTable.hasMany(DynamicColumn, {
  sourceKey: 'id',
  foreignKey: 'tableId',
  as: 'columns',
});

DynamicColumn.belongsTo(DynamicTable, {
  foreignKey: 'tableId',
  as: 'table',
});

// 重新导出模型
export {
  DynamicTable,
  DynamicColumn,
}; 