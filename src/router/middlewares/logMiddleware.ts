import ActionLog from '../../db/models/ActionLog';
import { logError } from '../../logger';

export const logMiddleware = async (req, res) => {
  try {
    let body = null;
    // 不处理 content-type 不是 application/json 的请求体
    if (req.headers['content-type']?.includes('application/json')) {
      body = await req.json();
    }
    const logData = {
      userId: req.user?.id || null,
      action: `${req.method} ${req.path}`,
      method: req.method,
      path: req.path,
      params: req.params,
      body,
      ip: req.ip,
    };
    ActionLog.create(logData);
  } catch (error) {
    // 如果请求体不是JSON，或者有其他错误，记录下来但不要阻塞主流程
    if (error.message.includes('body is not valid JSON')) {
      // ignore
    } else {
        logError(error);
    }
  }
}; 