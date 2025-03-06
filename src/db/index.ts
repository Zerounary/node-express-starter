const { Sequelize } = require('sequelize');

const db = new Sequelize('testorcl', 'bosnds3', 'abc123', {
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: true,
  host: 'app.burgeonerp.cn',
  port: 22990,
  dialect: 'oracle', /* one of 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'db2' | 'snowflake' | 'oracle' */
  define: {
    freezeTableName: true,
    underscored: false,
  }
});
export default db;