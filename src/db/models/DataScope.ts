import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import { Role } from './Role';

class DataScope extends Model {
  public id!: number;
  public roleId!: number;
  public resource!: string; // table name e.g. 'orders'
  public rule!: any; // JSON for storing the Sequelize-compatible rule
  public ruleBuilder!: any;
  public description!: string;
}

DataScope.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'roles',
      key: 'id',
    },
  },
  resource: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rule: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  ruleBuilder: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'DataScope',
  tableName: 'data_scopes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['roleId', 'resource'],
    },
  ],
});

Role.hasMany(DataScope, { foreignKey: 'roleId' });
DataScope.belongsTo(Role, { foreignKey: 'roleId' });

export { DataScope };
