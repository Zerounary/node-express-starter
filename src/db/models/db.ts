import { DataTypes } from 'sequelize';
import db from '../index'

const DbModel = db.define(
  'DbModel',
  {
    // Model attributes are defined here
    id: {
      type: DataTypes.NUMBER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    client_id: {
      type: DataTypes.NUMBER,
    },
    name: {
      type: DataTypes.STRING,
    },
    ty: {
      type: DataTypes.STRING,
      defaultValue: 'ORACLE'
    },
    host: {
      type: DataTypes.STRING,
    },
    port: {
      type: DataTypes.STRING,
    },
    service_name: {
      type: DataTypes.STRING,
    },
    username: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
    },
    is_active: {
      type: DataTypes.STRING,
      defaultValue: 'Y'
    },
  },
  {
    // Other model options go here
    tableName: 'BPM_DB',
  },
);

export default DbModel;