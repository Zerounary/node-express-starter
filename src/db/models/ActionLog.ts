import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import User from './User';
import { commontFields } from './common';

class ActionLog extends Model {
  public id!: number;
  public userId!: number;
  public action!: string;
  public method!: string;
  public path!: string;
  public params!: object;
  public body!: object;
  public ip!: string;
}

ActionLog.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true, // 允许匿名操作
  },
  action: {
    type: DataTypes.STRING,
  },
  method: {
    type: DataTypes.STRING,
  },
  path: {
    type: DataTypes.STRING,
  },
  params: {
    type: DataTypes.JSON,
  },
  body: {
    type: DataTypes.JSON,
  },
  ip: {
    type: DataTypes.STRING,
  },
  ...commontFields,
}, {
  sequelize,
  tableName: 'action_logs',
  timestamps: true,
});

export default ActionLog; 