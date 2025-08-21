import { Controller, Post, Get } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import User from "../db/models/User";
import AuthService from "../services/AuthService";
import PermissionService from "../services/PermissionService";
import CacheService from "../services/CacheService";
import { z } from 'zod';
import { logError } from "../logger";

const userSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  tenantId: z.number().int(),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

@Controller("/auth")
export default class AuthController {

  @Post("/register")
  async register(req, res) {
    try {
      const body = await req.json();
      const validationResult = userSchema.safeParse(body);
      if (!validationResult.success) {
        return fail(validationResult.error.errors, 400);
      }

      const { username, password, tenantId } = validationResult.data;
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return fail("Username already exists", 409);
      }

      const user = await User.create({ username, password, tenantId });
      return ok({ id: user.id, username: user.username, tenantId: user.tenantId });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Get("/codes")
  async getPermission(req, res) {
    const { id: userId } = req.user;
    const permissions = await PermissionService.getAllUserPermissions(userId);
    return ok(Array.from(permissions));
  }

  @Post("/login")
  async login(req, res) {
    try {
      const body = await req.json();
      const validationResult = loginSchema.safeParse(body);
      if (!validationResult.success) {
        return fail(validationResult.error.errors, 400);
      }

      const { username, password } = validationResult.data;
      const user = await User.findOne({ where: { username } });
      if (!user) {
        return fail("Invalid username or password", 401);
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return fail("Invalid username or password", 401);
      }

      const accessToken = AuthService.generateToken(user);
      
      CacheService.clearUserCache(user.id);
      // Pre-warm caches
      await PermissionService.getAllUserPermissions(user.id);

      // 返回没有密码的用户信息
      const userInfo = {
        id: user.id,
        username: user.username,
        tenantId: user.tenantId,
      };
      return ok({ accessToken, ...userInfo });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }

  @Post("/logout")
  async logout(req, res) {
    try {
      const { id: userId } = req.user;
      CacheService.clearUserCache(userId);
      return ok({ message: "Logout successful, cache cleared." });
    } catch (error) {
      logError(error);
      return fail(error.message);
    }
  }
}
