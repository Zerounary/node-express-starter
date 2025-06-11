import { Model, DataTypes, HasManyGetAssociationsMixin } from 'sequelize';
import sequelize from '../sequelize';
import type DynamicColumn from './DynamicColumn';
import Tenant from './Tenant';

class DynamicTable extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public description!: string | null;
  public created!: string;
  public updated!: string;

  public getColumns!: HasManyGetAssociationsMixin<DynamicColumn>;
  public columns?: DynamicColumn[];
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
  name: {
    type: new DataTypes.STRING(128),
    allowNull: false,
    unique: 'dynamic_tables_name_key',
  },
  description: {
    type: new DataTypes.STRING(255),
    allowNull: true,
  },
  created: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updated: {
    type: DataTypes.STRING,
    allowNull: true,
  },
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