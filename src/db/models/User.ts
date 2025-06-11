import { DataTypes, Model } from 'sequelize';
import sequelize from '../sequelize';
import bcrypt from 'bcryptjs';
import Tenant from './Tenant';

class User extends Model {
  public id!: number;
  public tenantId!: number;
  public username!: string;
  public password!: string;

  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Tenant,
      key: 'id',
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'user_tenant_unique',
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'users',
  timestamps: true,
  indexes: [{
    unique: true,
    fields: ['tenantId', 'username'],
    name: 'user_tenant_unique'
  }],
  hooks: {
    beforeCreate: async (user: User) => {
      user.password = await bcrypt.hash(user.password, 10);
    },
    beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, 10);
        }
    }
  }
});

export default User; 