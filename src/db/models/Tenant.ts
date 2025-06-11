import { DataTypes, Model, HasManyGetAssociationsMixin } from 'sequelize';
import sequelize from '../sequelize';
import User from './User';

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
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'tenants_name_key',
  },
}, {
  sequelize,
  tableName: 'tenants',
  timestamps: true,
});

export default Tenant; 