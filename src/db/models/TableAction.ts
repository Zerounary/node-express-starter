import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import DynamicTable from './DynamicTable';
import Tenant from './Tenant';
import { commontFields } from './common';

class TableAction extends Model {
  public id!: number;
  public tableId!: number;
  public type!: string;
  public name!: string;
  public resource!: string;
}

TableAction.init({
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
  tableId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'dynamic_tables',
      key: 'id',
    },
  },
  type: {
    type: DataTypes.ENUM('list', 'item', 'form'),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  resource: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ...commontFields,
}, {
  sequelize,
  tableName: 'table_actions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['tableId', 'resource'],
    },
  ],
});

DynamicTable.hasMany(TableAction, { foreignKey: 'tableId' });

export { TableAction };
