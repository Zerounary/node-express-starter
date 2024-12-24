const { Sequelize } = require('sequelize');

const db = new Sequelize('hed', 'hed', 'hed123', {
  host: 'localhost',
  dialect: 'mysql' /* one of 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'db2' | 'snowflake' | 'oracle' */
});

export default db;