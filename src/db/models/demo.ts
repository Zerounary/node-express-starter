import { DataTypes } from 'sequelize';
import db from '../index'

const Demo = db.define(
  'demo',
  {
    id: {
      type: DataTypes.NUMBER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    // Model attributes are defined here
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      // allowNull defaults to true
    },
  },
  {
    // Other model options go here
    tableName: 'BPM_DEMO',
  },
);

export default Demo;