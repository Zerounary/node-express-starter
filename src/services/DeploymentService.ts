import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import deployConfig from '../config/deploy.config';

export class DeploymentService {
  private static instance: DeploymentService;
  private platform: string;

  private constructor() {
    this.platform = os.platform();
  }

  public static getInstance(): DeploymentService {
    if (!DeploymentService.instance) {
      DeploymentService.instance = new DeploymentService();
    }
    return DeploymentService.instance;
  }

  /**
   * 执行部署
   * @param projectPath 项目路径
   * @param branch 分支名称
   */
  public async deploy(projectPath: string, branch: string): Promise<void> {
    try {
      const config = deployConfig.deployments[projectPath];
      if (!config) {
        throw new Error(`未找到项目 ${projectPath} 的部署配置`);
      }

      // 获取对应平台的脚本
      const scriptName = config.scripts[this.platform];
      if (!scriptName) {
        throw new Error(`未找到平台 ${this.platform} 的部署脚本`);
      }

      const scriptPath = path.join(deployConfig.scriptsPath, scriptName);
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`部署脚本不存在: ${scriptPath}`);
      }

      // 执行部署脚本
      await this.executeScript(scriptPath, config.workDir, branch);

      // 如果需要重启服务
      if (config.needRestart) {
        await this.executeCommand(config.restartCommand, config.workDir);
      }

      this.log('info', `项目 ${projectPath} (${branch}) 部署成功`);
    } catch (error) {
      this.log('error', `部署失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 执行脚本
   */
  private executeScript(scriptPath: string, workDir: string, branch: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = this.platform === 'win32'
        ? `${scriptPath} ${branch}`
        : `bash ${scriptPath} ${branch}`;

      exec(command, { cwd: workDir }, (error, stdout, stderr) => {
        if (error) {
          this.log('error', `脚本执行错误: ${error.message}`);
          this.log('error', `标准错误输出: ${stderr}`);
          reject(error);
          return;
        }

        this.log('info', `脚本执行输出: ${stdout}`);
        if (stderr) {
          this.log('warn', `脚本警告信息: ${stderr}`);
        }
        resolve();
      });
    });
  }

  /**
   * 执行命令
   */
  private executeCommand(command: string, workDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: workDir }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * 记录日志
   */
  private log(level: 'info' | 'error' | 'warn', message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    // 写入日志文件
    fs.appendFileSync(deployConfig.logging.file, logMessage);
    
    // 控制台输出
    console[level](message);
  }
} 