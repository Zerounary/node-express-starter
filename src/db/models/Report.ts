import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';

class Report extends Model {
  public id!: number;
  public name!: string;
  public sqlTemplate!: string;
}

Report.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  sqlTemplate: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'reports',
  timestamps: true,
});

export default Report; 