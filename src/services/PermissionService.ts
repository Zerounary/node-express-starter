import User from '../db/models/User';
import { Role, Permission } from '../db/models/Role';
import CacheService from './CacheService';

class PermissionService {
    /**
     * Computes user permissions directly from the database, without consulting the cache.
     * This method is intended for use by the CacheService when the cache is disabled,
     * or for cache warming.
     * @param userId The ID of the user.
     * @returns A promise that resolves to a set of permission strings.
     */
    public async computeUserPermissions(userId: number): Promise<Set<string>> {
        const user = await User.findByPk(userId, {
            include: [{
                model: Role,
                include: [Permission]
            }]
        });

        if (!user) return new Set<string>();

        const actions = new Set<string>();
        user.Roles.forEach(role => {
            role.Permissions.forEach(permission => {
                actions.add(permission.action);
            });
        });
        
        return actions;
    }

    /**
     * Retrieves all permissions for a given user, utilizing the cache if available.
     * If the cache is disabled, it will fetch permissions directly from the database.
     * @param userId The ID of the user.
     * @returns A promise that resolves to a set of permission strings.
     */
    public async getAllUserPermissions(userId: number): Promise<Set<string>> {
        // getPermissions will fetch from DB if cache is disabled.
        const cachedPermissions = await CacheService.getPermissions(userId);
        if (cachedPermissions) {
            return cachedPermissions;
        }

        // If we are here, it means cache is enabled, but this user's permissions are not cached.
        // So, we compute them, cache them, and return them.
        const permissions = await this.computeUserPermissions(userId);
        
        CacheService.setPermissions(userId, permissions);
        return permissions;
    }

    public async hasVipPermission(memberId: number, tableName: string): Promise<boolean> {
        const table = await CacheService.getTableByAliasName(tableName)
        return table.openFront
    }

    public async hasPermission(userId: number, requiredAction: string): Promise<boolean> {
        const actions = await this.getAllUserPermissions(userId);

        // Check for exact match or wildcard match
        // e.g., 'data:create:*' grants permission for creating any data
        const requiredActionParts = requiredAction.split(':');
        for (const action of actions) {
            const parts = action.split(':');
            if (parts.length === requiredActionParts.length) {
                const match = parts.every((part, i) => part === '*' || part === requiredActionParts[i]);
                if (match) return true;
            }
        }

        return false;
    }
}

export default new PermissionService();
