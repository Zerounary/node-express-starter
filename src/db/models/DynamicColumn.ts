import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../sequelize';
import type DynamicTable from './DynamicTable';
import Tenant from './Tenant';
import { commontFields } from './common';

class DynamicColumn extends Model {
  public id!: number;
  public name!: string;
  public dataType!: string;
  public tableId!: number;
  public created!: string;
  public updated!: string;
  public description!: string;
  public relatedToTableId?: number | null;
  public relatedToTableName?: string | null;
  public ui?: any | null;
  public ak?: boolean| null;
  public dk?: boolean| null;
  public required?: boolean| null;
  public sortable?: boolean| null;
  public orderno?: number | null;

  public getTable!: BelongsToGetAssociationMixin<DynamicTable>;
  public table?: DynamicTable;
}

DynamicColumn.init({
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
    type: new DataTypes.STRING(128),
    allowNull: false,
  },
  dataType: {
    type: new DataTypes.STRING(128),
    allowNull: false,
  },
  required: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  ak: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  dk: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  sortable: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  tableId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'dynamic_tables',
      key: 'id',
    },
    allowNull: false,
  },
  relatedToTableId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'dynamic_tables',
      key: 'id',
    },
  },
  ui: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  orderno: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ...commontFields,
}, {
  sequelize,
  tableName: 'dynamic_columns',
  indexes: [
    {
      unique: true,
      fields: ['tableId', 'name'],
    },
  ],
  timestamps: true,
});

export default DynamicColumn; 