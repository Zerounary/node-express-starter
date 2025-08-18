import { DataTypes, Model, HasManyGetAssociationsMixin } from 'sequelize';
import sequelize from '../sequelize';
import User from './User';
import { commontFields } from './common';

class Tenant extends Model {
  public id!: number;
  public name!: string;

  public getUsers!: HasManyGetAssociationsMixin<User>;
}

Tenant.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'tenants_name_key',
  },
  ...commontFields,
}, {
  sequelize,
  tableName: 'tenants',
  timestamps: true,
});

export default Tenant; 