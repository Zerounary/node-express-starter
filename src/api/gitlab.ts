import { fail, ok } from "@/router/api";
import { Controller, Post } from "@/utils/routeDecorators";
import { DeploymentService } from "../services/DeploymentService";
import deployConfig from '../config/deploy.config';

@Controller("/gitlab")
export default class GitlabController {
  private deploymentService: DeploymentService;

  constructor() {
    this.deploymentService = DeploymentService.getInstance();
  }

  @Post("/webhook")
  async handleWebhook(req, res) {
    try {
      // 验证 Webhook 密钥
      const gitlabToken = req.headers["x-gitlab-token"];
      if (gitlabToken !== deployConfig.webhookSecret) {
        return fail("无效的 Webhook 密钥");
      }

      // 验证事件类型
      const eventType = req.headers["x-gitlab-event"];
      if (eventType !== "Push Hook") {
        return fail("不支持的事件类型");
      }

      const data = await req.json();
      const { ref, project } = data;

      // 提取分支名
      const branch = ref.split("/").pop();

      // 执行部署
      await this.deploymentService.deploy(project.path_with_namespace, branch);

      return ok("部署任务已启动");
    } catch (error) {
      console.error("Webhook 处理错误:", error);
      return fail(error.message);
    }
  }
}
