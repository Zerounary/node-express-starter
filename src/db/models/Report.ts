import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import Tenant from './Tenant';
import { commontFields } from './common';

class Report extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public sqlTemplate!: string;
}

Report.init({
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
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'reports_tenant_name_key',
  },
  sqlTemplate: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  ...commontFields,
}, {
  sequelize,
  tableName: 'reports',
  timestamps: true,
  indexes: [{
    unique: true,
    fields: ['tenantId', 'name'],
    name: 'reports_tenant_name_key'
  }]
});

export default Report; 