import { Controller, Post, Get } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { Role, Permission } from "../db/models/Role";
import User from "../db/models/User";
import { logError } from "../logger";
import { z } from 'zod';

@Controller("/roles")
export default class RoleController {

    @Post("/")
    async createRole(req, res) {
        const { name } = await req.json();
        const { tenantId } = req.user;
        const role = await Role.create({ name, tenantId });
        return ok(role);
    }

    @Get("/")
    async getRoles(req, res) {
        const { tenantId } = req.user;
        const roles = await Role.findAll({ where: { tenantId } });
        return ok(roles);
    }

    @Post("/perms")
    async getPermission(req, res) {
        const { roleId } = await req.json();
        // 1. 查找角色并验证其归属
        const role = await Role.findByPk(roleId);
        if (!role || role.tenantId !== req.user.tenantId) {
            return fail("角色未找到 (Role not found)", 404);
        }
        const perms = await role.getPermissions();
        
        return ok(perms.map(e => e.action));
    }

    @Post("/assign-permission")
    async assignPermission(req, res) {
        try {
            const { roleId, permissions: permissionActions } = await req.json();

            // 1. 查找角色并验证其归属
            const role = await Role.findByPk(roleId);
            if (!role || role.tenantId !== req.user.tenantId) {
                return fail("角色未找到 (Role not found)", 404);
            }

            // 2. 确保所有权限都存在于数据库中，如果不存在则创建
            const permissionPromises = (permissionActions as string[]).map(action =>
                Permission.findOrCreate({
                    where: { action },
                    defaults: { action, description: action } // 默认使用 action 作为 description
                })
            );
            // findOrCreate 返回一个数组 [instance, created]，我们只需要 instance
            const permissionInstances = (await Promise.all(permissionPromises)).map(p => p[0]);

            // 3. 使用 setPermissions 来同步角色权限，这会自动处理新增和删除
            await role.setPermissions(permissionInstances);

            return ok({ success: true, message: "权限分配成功" });
        } catch (error) {
            logError(error);
            return fail("分配权限失败 (Failed to assign permissions)", 500);
        }
    }

    @Post("/assign-user")
    async assignUserToRole(req, res) {
        const { userId, roleId } = await req.json();
        const user = await User.findByPk(userId);
        if (!user || user.tenantId !== req.user.tenantId) {
            return fail("User not found", 404);
        }
        const role = await Role.findByPk(roleId);
        if (!role || role.tenantId !== req.user.tenantId) {
            return fail("Role not found", 404);
        }
        await user.addRole(role);
        return ok({ success: true });
    }
} 