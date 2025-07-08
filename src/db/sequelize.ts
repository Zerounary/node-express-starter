import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('postgresql://postgres:POSTGRES@localhost:5432/hope', {
  logging: false,
});

export default sequelize; 