import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';
import { commontFields } from './common';
import Tenant from './Tenant';

interface IMediaCategory extends Model {
  id: number;
  name: string;
  parentId?: number | null;
}

class MediaCategory extends Model implements IMediaCategory {
  public id!: number;
  public name!: string;
  public parentId!: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MediaCategory.init(
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
    name: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    parentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'media_categories',
        key: 'id',
      },
    },
    ...commontFields,
  },
  {
    tableName: 'media_categories',
    sequelize,
    timestamps: true,
  }
);

export default MediaCategory;