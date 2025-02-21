import { DataTypes } from 'sequelize';
import db from '../index'

const Client = db.define(
  'Client',
  {
    // Model attributes are defined here
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      // allowNull defaults to true
    },
  },
  {
    // Other model options go here
    tableName: 'BPM_CLIENT',
  },
);

export default Client;