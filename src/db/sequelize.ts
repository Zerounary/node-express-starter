import { Sequelize } from 'sequelize';

require('dotenv').config();

const url = process.env.DATABASE_URL || 'mysql://communityAdmin:z4jHD&q9SQm6@10.6.108.166:3306/hope';
console.log('🚀 ~ url:', url)

const sequelize = new Sequelize(url, {
  logging: false,
});

export default sequelize; 