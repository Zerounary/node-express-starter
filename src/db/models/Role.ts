import { Model, DataTypes, BelongsToManyAddAssociationMixin, BelongsToManyGetAssociationsMixin } from 'sequelize';
import sequelize from '../sequelize';
import Tenant from './Tenant';
import User from './User';
import { commontFields } from './common';

class Role extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public description!: string;
  public addPermission!: BelongsToManyAddAssociationMixin<Permission, number>;
  public getPermissions!: BelongsToManyGetAssociationsMixin<Permission>;
  public Permissions?: Permission[];
}

class Permission extends Model {
  public id!: number;
  public action!: string; // e.g., 'create:data:products', 'read:document:purchase_orders'
  public description!: string;
}

Role.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Tenant, key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: true },
  ...commontFields,
}, { sequelize, tableName: 'roles', indexes: [{ unique: true, fields: ['tenantId', 'name'] }] });

Permission.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  action: { type: DataTypes.STRING, allowNull: false, unique: 'permission_action' },
  description: { type: DataTypes.STRING },
  ...commontFields,
}, { sequelize, tableName: 'permissions'  });

const UserRoles = sequelize.define('user_roles', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  roleId: { type: DataTypes.INTEGER, primaryKey: true },
  ...commontFields,
});

const RolePermissions = sequelize.define('role_permissions', {
  roleId: { type: DataTypes.INTEGER, primaryKey: true },
  permissionId: { type: DataTypes.INTEGER, primaryKey: true },
  ...commontFields,
});

// Associations
User.belongsToMany(Role, { through: 'user_roles', foreignKey: 'userId' });
Role.belongsToMany(User, { through: 'user_roles', foreignKey: 'roleId' });
Role.belongsToMany(Permission, { through: 'role_permissions', foreignKey: 'roleId' });
Permission.belongsToMany(Role, { through: 'role_permissions', foreignKey: 'permissionId' });

export { Role, Permission, UserRoles, RolePermissions }; 