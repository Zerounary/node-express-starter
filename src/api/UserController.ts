import { Controller, Post, Get } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import User from "../db/models/User";
import AuthService from "../services/AuthService";
import { z } from 'zod';
import { logError } from "../logger";
import { getMenus } from "@/hooks/table_categories";

const userSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  tenantId: z.number().int(),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

@Controller("/user")
export default class UserController {

  @Get("/info")
  async getUserInfo(req, res) {
    const { id: userId } = req.user;
    const user = await User.findByPk(userId);
    if(!user) return res.status(401).json(fail('登录超时,请重新登录', 401));
    const menus = await getMenus({ user: req.user });
    return ok({
      id: user.id,
      username: user.username,
      tenantId: user.tenantId,
      realName: user.realName,
      menus,
    });
  }

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

} 