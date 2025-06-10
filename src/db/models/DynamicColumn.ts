import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../sequelize';
import type DynamicTable from './DynamicTable';

class DynamicColumn extends Model {
  public id!: number;
  public name!: string;
  public dataType!: string;
  public tableId!: number;
  public created!: string;
  public updated!: string;

  public getTable!: BelongsToGetAssociationMixin<DynamicTable>;
  public table?: DynamicTable;
}

DynamicColumn.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: new DataTypes.STRING(128),
    allowNull: false,
  },
  dataType: {
    type: new DataTypes.STRING(128),
    allowNull: false,
  },
  tableId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'dynamic_tables',
      key: 'id',
    },
    allowNull: false,
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