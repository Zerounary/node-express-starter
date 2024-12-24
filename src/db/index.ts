const { Sequelize } = require('sequelize');

const db = new Sequelize('hed', 'hed', 'hed123', {
  pool: {
    max: 100,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  logging: false,
  host: 'localhost',
  dialect: 'mysql' /* one of 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'db2' | 'snowflake' | 'oracle' */
});

export default db;