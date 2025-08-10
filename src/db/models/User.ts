import { DataTypes, Model, BelongsToManyAddAssociationMixin, BelongsToManyGetAssociationsMixin } from 'sequelize';
import sequelize from '../sequelize';
import bcrypt from 'bcryptjs';
import Tenant from './Tenant';
import { Role } from './Role';
import { commontFields } from './common';

class User extends Model {
  public id!: number;
  public tenantId!: number;
  public realName?: string;
  public username!: string;
  public password!: string;
  public Roles?: Role[];
  public addRole!: BelongsToManyAddAssociationMixin<Role, number>;
  public getRoles!: BelongsToManyGetAssociationsMixin<Role>;
  
  public async comparePassword(password: string): Promise<boolean> {
    return password == this.password;// bcrypt.compare(password, this.password);
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
  realName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ...commontFields,
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
      // user.password = await bcrypt.hash(user.password, 10);
    },
    beforeUpdate: async (user: User) => {
        // if (user.changed('password')) {
            // user.password = await bcrypt.hash(user.password, 10);
        // }
    }
  }
});

export default User; 