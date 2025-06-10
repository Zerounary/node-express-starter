import { Model, DataTypes, HasManyGetAssociationsMixin } from 'sequelize';
import sequelize from '../sequelize';
import type DynamicColumn from './DynamicColumn';

class DynamicTable extends Model {
  public id!: number;
  public name!: string;
  public description!: string | null;

  public getColumns!: HasManyGetAssociationsMixin<DynamicColumn>;
  public columns?: DynamicColumn[];
}

DynamicTable.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
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
}, {
  sequelize,
  tableName: 'dynamic_tables',
});

export default DynamicTable;