import { Sequelize } from 'sequelize';
import * as path from 'path';

// 确保存储目录存在
const dbPath = path.join(__dirname, '../../db');
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(dbPath, 'database.sqlite'),
  logging: console.log,
  query: {
    plain: true,
  }
});

export default sequelize; 