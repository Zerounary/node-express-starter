const path = require('path');

module.exports = {
  // GitLab Webhook 密钥
  webhookSecret: process.env.GITLAB_WEBHOOK_SECRET || 'your-webhook-secret',
  
  // 部署脚本目录
  scriptsPath: path.join(__dirname, '../../scripts'),
  
  // 部署配置
  deployments: {
    // 示例项目配置
    'mike/diaspora': {
      // 不同环境的部署脚本
      scripts: {
        win32: 'deploy.bat',
        linux: 'deploy.sh',
        darwin: 'deploy.sh'
      },
      // 部署工作目录
      workDir: '.',
      // 部署后是否需要重启服务
      needRestart: false,
      // 重启命令
      restartCommand: 'pm2 restart app'
    }
  },
  
  // 日志配置
  logging: {
    level: 'info',
    file: path.join(__dirname, '../../logs/deploy.log')
  }
}; 