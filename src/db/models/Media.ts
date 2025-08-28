import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { commontFields } from './common';
import Tenant from './Tenant';

type MediaType = 'image' | 'video';

// Interface for Media attributes
export interface IMedia {
  id: number;
  type: MediaType;
  url: string;
  thumbUrl?: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  tags?: string[];
  meta?: Record<string, any>;
  categoryId?: number | null;
  linkedEntityName?: string;
  linkedEntityUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Sequelize Model
class Media extends Model implements IMedia {
  public id!: number;
  public type!: MediaType;
  public url!: string;
  public thumbUrl?: string;
  public name!: string;
  public size?: number;
  public width?: number;
  public height?: number;
  public duration?: number;
  public tags?: string[];
  public meta?: Record<string, any>;
  public categoryId?: number | null;
  public linkedEntityName?: string;
  public linkedEntityUrl?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Media.init(
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
    type: {
      type: DataTypes.ENUM('image', 'video'),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    thumbUrl: {
      type: DataTypes.STRING(2048),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    width: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    duration: {
      type: DataTypes.FLOAT.UNSIGNED,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'media_categories',
        key: 'id',
      },
    },
    linkedEntityName: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    linkedEntityUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    ...commontFields,
  },
  {
    tableName: 'media',
    sequelize,
    timestamps: true,
    indexes: [
        {
            fields: ['name']
        }
    ]
  }
);

export default Media;