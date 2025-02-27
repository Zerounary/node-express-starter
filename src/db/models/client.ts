import { DataTypes } from 'sequelize';
import db from '../index'

const Client = db.define(
  'Client',
  {
    // Model attributes are defined here
    id: {
      type: DataTypes.NUMBER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    client_id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      // allowNull defaults to true
    },
    online: {
      type: DataTypes.STRING,
      defaultValue: 'N'
      // allowNull defaults to true
    },
  },
  {
    // Other model options go here
    tableName: 'BPM_CLIENT',
  },
);

export default Client;