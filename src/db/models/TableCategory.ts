import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import { commontFields } from './common';
import Tenant from './Tenant';

class TableCategory extends Model {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public parentId!: number | null;
  public path!: string;
  public meta!: object;
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
  type: {
    type: new DataTypes.ENUM('catelog', 'menu', 'embedded', 'link', 'button'),
    allowNull: false,
    defaultValue: 'menu',
    comment: '菜单类型，catelog: 目录, menu: 菜单, embedded: 嵌入式页面, link: 外链, button: 按钮',
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
  meta: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  path: {
    type: new DataTypes.STRING(255),
    allowNull: true,
    defaultValue: '',
  },
  url: {
    type: new DataTypes.STRING(255),
    allowNull: true,
  },
  redirect: {
    type: new DataTypes.STRING(255),
    allowNull: true,
  },
  orderno: {
    type: DataTypes.INTEGER,
    allowNull: true,
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