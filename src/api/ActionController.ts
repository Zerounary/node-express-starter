import { logError } from "@/logger";
import { fail, ok } from "@/router/api";
import { checkPermission } from "@/router/middlewares/permissionMiddleware";
import HookService from "@/services/HookService";
import WorkflowService from "@/services/WorkflowService";
import { Controller, Post } from "@/utils/routeDecorators";

@Controller("/action/:tableName")
export default class DynamicController {

  @Post("/:actionName", [checkPermission('action::actionName::tableName')])
  async performAction(req, res) {
    try {
      const { tenantId, id: userId } = req.user;
      const { tableName, actionName } = req.params;
      const { id }  = req.query;
      let body = await req.json();

      // afterUpdate hook
      let result = await HookService.executeHook(tableName, actionName, id, {
        ...req.params,
        ...req.query,
        ...body
      });

            // Try to start a workflow for the new record
      await WorkflowService.createInstanceForRecord(req.user.tenantId, tableName, id);

      return ok(result);
    } catch (error) {
      logError(error);
      return fail(error.message, 400); // Use 400 for business logic errors
    }
  }
}