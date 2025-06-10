import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import User from './User';

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
    references: {
      model: User,
      key: 'id',
    },
    allowNull: true, // 允许匿名操作
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  method: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
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
}, {
  sequelize,
  tableName: 'action_logs',
  timestamps: true,
});

export default ActionLog; 