import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import { commontFields } from './common';
import Tenant from './Tenant';

// Interface for Region attributes
export interface IRegion {
  id: number;
  code: string;
  name: string;
  level: number; // 1: 省, 2: 市, 3: 区县
  parentCode?: string;
  parentId?: number;
  tenantId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Sequelize Model
class Region extends Model implements IRegion {
  public id!: number;
  public code!: string;
  public name!: string;
  public level!: number;
  public parentCode?: string;
  public parentId?: number;
  public tenantId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Region.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
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
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 3
      }
    },
    parentCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    parentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'regions',
        key: 'id',
      },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    ...commontFields,
  },
  {
    tableName: 'regions',
    sequelize,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['code'],
        name: 'region_code'
      },
      {
        fields: ['parentCode'],
        name: 'region_parentCode'
      },
      {
        fields: ['level'],
        name: 'region_level',
      },
      {
        fields: ['tenantId', 'level'],
        name: 'region_tenantId_level'
      }
    ]
  }
);

// 设置关联关系
Region.belongsTo(Region, { foreignKey: 'parentId', as: 'parent' });
Region.hasMany(Region, { foreignKey: 'parentId', as: 'children' });

export default Region;