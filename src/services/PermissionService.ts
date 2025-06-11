import User from '../db/models/User';
import { Role, Permission } from '../db/models/Role';
import { Op } from 'sequelize';

class PermissionService {
    public async hasPermission(userId: number, requiredAction: string): Promise<boolean> {
        const user = await User.findByPk(userId, {
            include: [{
                model: Role,
                include: [Permission]
            }]
        });

        if (!user) return false;

        const actions = new Set<string>();
        user.Roles.forEach(role => {
            role.Permissions.forEach(permission => {
                actions.add(permission.action);
            });
        });

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