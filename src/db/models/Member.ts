import { DataTypes, Model } from "sequelize";
import Tenant from "./Tenant";
import { commontFields } from "./common";
import sequelize from "../sequelize";

class Member extends Model {
  public id!: number;
  public tenantId!: number;
  public openid?: string;
  public sex?: number;
  public headimgurl?: string;
  public nickname?: string;
  public realname?: string;
  public phone?: string;
  public username?: string;
  public password?: string;
}


Member.init({
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
      key: 'id',
    }
  },
  openid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  realname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  headimgurl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sex: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ...commontFields,
}, {
  sequelize,
  tableName: 'members',
  timestamps: true,
});

export default Member;