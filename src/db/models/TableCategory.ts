import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import { commontFields } from './common';
import Tenant from './Tenant';

class TableCategory extends Model {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public parentId!: number | null;
  public level!: number;
  public path!: string;
  public created!: string;
  public updated!: string;
}

TableCategory.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: Tenant,
        key: 'id'
    }
  },
  name: {
    type: new DataTypes.STRING(128),
    allowNull: false,
  },
  description: {
    type: new DataTypes.STRING(255),
    allowNull: true,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: TableCategory,
      key: 'id'
    }
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '分类层级，1为顶级分类，2为子系统等二级分类'
  },
  path: {
    type: new DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '',
    comment: '分类路径，格式为1,2,3表示分类的层级路径'
  },
  ...commontFields,
}, {
  sequelize,
  tableName: 'table_categories',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'parentId'],
      name: 'table_categories_name_parent_key'
    }
  ]
});

export default TableCategory;