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

    // 新增 permission
    @Post("/permission")
    async createPermission(req, res) {
        const { action, description } = await req.json();
        const permission = await Permission.create({ action, description });
        return ok(permission);
    }

    @Post("/assign-permission")
    async assignPermission(req, res) {
        const { roleId, permissionId } = await req.json();
        const role = await Role.findByPk(roleId);
        if (!role || role.tenantId !== req.user.tenantId) {
            return fail("Role not found", 404);
        }
        await role.addPermission(permissionId);
        return ok({ success: true });
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