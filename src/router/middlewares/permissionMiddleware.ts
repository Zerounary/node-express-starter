import PermissionService from '../../services/PermissionService';
import { fail } from '../api';

export const checkPermission = (action: string) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json(fail('Authentication required.'));
        }

        // Replace placeholders like :tableName with actual values from params
        const finalAction = action.replace(/:(\w+)/g, (match, key) => req.params[key] || match);

        // TODO 这个需要优化，避免每次都查询数据库
        const hasPerm = await PermissionService.hasPermission(req.user.id, finalAction);
        if (!hasPerm) {
           return res.status(403).json(fail(`Forbidden: Missing permission for action: ${finalAction}`));
        }
    };
}; 