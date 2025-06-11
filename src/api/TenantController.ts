import { Controller, Post } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import Tenant from "../db/models/Tenant";
import { logError } from "../logger";
import { z } from "zod";
import User from "@/db/models/User";

const tenantSchema = z.object({
  name: z.string().min(2),
});

const quickCreateSchema = z.object({
  tenantName: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(6),
});

@Controller("/tenants")
export default class TenantController {
  @Post("/")
  async create(req, res) {
    try {
      const body = await req.json();
      const validationResult = tenantSchema.safeParse(body);
      if (!validationResult.success) {
        return fail(validationResult.error.errors, 400);
      }

      const tenant = await Tenant.create(validationResult.data);
      return ok(tenant);
    } catch (error) {
      logError(error);
      // Handle unique constraint violation
      if (error.name === "SequelizeUniqueConstraintError") {
        return fail("Tenant name already exists", 409);
      }
      return fail(error.message);
    }
  }

  // 新增一个根据租户名称，账号，密码，快速创建租户和用户的接口
  @Post("/quick-create")
  async quickCreate(req, res) {
    // 使用zod验证
    const validationResult = quickCreateSchema.safeParse(await req.json());
    if (!validationResult.success) {
      return fail(validationResult.error.errors, 400);
    }

    const { tenantName, username, password } = await req.json();
    const tenant = await Tenant.create({ name: tenantName });
    const user = await User.create({ username, password, tenantId: tenant.id });
    // user 不返回密码
    user.password = undefined;
    return ok({ tenant, user });
  }
}
