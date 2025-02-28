import { DataTypes } from 'sequelize';
import db from '../index'
import { before } from 'node:test';

const App = db.define(
  'App',
  {
    // Model attributes are defined here
    id: {
      type: DataTypes.NUMBER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      // allowNull defaults to true
    },
    app_name: {
      type: DataTypes.STRING,
      // allowNull defaults to true
    },
    app_type: {
      type: DataTypes.STRING,
      defaultValue: 'Service',
      comment: 'Service: 服务。 Tool: 工具'
      // allowNull defaults to true
    },
    url: {
      type: DataTypes.STRING,
      // allowNull defaults to true
    },
    useable: {
      type: DataTypes.STRING,
      defaultValue: 'Y'
      // allowNull defaults to true
    },
  },
  {
    // Other model options go here
    tableName: 'BPM_APP',
  }
);

export default App;