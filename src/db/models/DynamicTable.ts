import { Model, DataTypes, HasManyGetAssociationsMixin, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../sequelize';
import type DynamicColumn from './DynamicColumn';
import type { TableAction } from './TableAction';
import Tenant from './Tenant';
import TableCategory from './TableCategory';
import { commontFields } from './common';

class DynamicTable extends Model {
  public id!: number;
  public tenantId!: number;
  public categoryId!: number | null;
  public name!: string;
  public hideMenu?: boolean | null;
  public alias_name!: string;
  public description!: string | null;
  public defaultSort?: string;
  public created!: string;
  public updated!: string;
  

  public getColumns!: HasManyGetAssociationsMixin<DynamicColumn>;
  public columns?: DynamicColumn[];
  public getActions!: HasManyGetAssociationsMixin<TableAction>;
  public actions?: TableAction[];
  public getCategory!: BelongsToGetAssociationMixin<TableCategory>;
  public category?: TableCategory;
}

DynamicTable.init({
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
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
        model: TableCategory,
        key: 'id'
    },
    comment: '表类别ID，关联到表分类表'
  },
  hideMenu: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  name: {
    type: new DataTypes.STRING(128),
    allowNull: false,
    unique: 'dynamic_tables_name_key',
  },
  alias_name: {
    type: new DataTypes.STRING(128),
    allowNull: false,
    unique: 'dynamic_tables_alias_name_key',
  },
  description: {
    type: new DataTypes.STRING(255),
    allowNull: true,
  },
  defaultSort: {
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
  tableName: 'dynamic_tables',
  timestamps: true,
  indexes: [{
    unique: true,
    fields: ['tenantId', 'name'],
    name: 'dynamic_tables_tenant_name_key'
  }]
});

export default DynamicTable;