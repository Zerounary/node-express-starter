import { logError } from "@/logger";
import { fail, ok } from "@/router/api";
import { checkPermission } from "@/router/middlewares/permissionMiddleware";
import HookService from "@/services/HookService";
import WorkflowService from "@/services/WorkflowService";
import { AppError } from "@/utils";
import { Controller, Post } from "@/utils/routeDecorators";

@Controller("/action/:tableName")
export default class DynamicController {

  @Post("/:actionName", [checkPermission('action::tableName::actionName')])
  async performAction(req, res) {
    try {
      const { tableName, actionName } = req.params;
      const { id }  = req.query;

      if(!await HookService.hasHooks(tableName, actionName)) {
        throw new AppError(`[${tableName}:${actionName}] 动作接口不存在`);
      }

      let body = await req.json();

      // afterUpdate hook
      let result = await HookService.executeHook(tableName, actionName, {
        id,
        ...req.params,
        ...req.query,
        ...body,
        res,
        user: req.user,
      });

      // Try to start a workflow for the new record
      await WorkflowService.createInstanceForRecord(req.user.tenantId, tableName, id);

      return ok(result);
    } catch (error) {
      logError(error);
      return fail(error.message, error?.code); // Use 400 for business logic errors
    }
  }
}