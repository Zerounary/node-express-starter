import DynamicColumn from './DynamicColumn';
import DynamicTable from './DynamicTable';
import TableCategory from './TableCategory';

// 设置DynamicTable和TableCategory之间的关联关系
DynamicTable.belongsTo(TableCategory, {
  foreignKey: 'categoryId',
  as: 'category'
});

TableCategory.hasMany(DynamicTable, {
  foreignKey: 'categoryId',
  as: 'tables'
});

// 设置TableCategory的自关联，实现层级结构
TableCategory.belongsTo(TableCategory, {
  foreignKey: 'parentId',
  as: 'parent'
});

TableCategory.hasMany(TableCategory, {
  foreignKey: 'parentId',
  as: 'children'
});

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

export default function setupAssociations() {
  // 这个函数可以在应用启动时调用，确保所有关联关系都被正确设置
  console.log('Database associations have been set up');
}