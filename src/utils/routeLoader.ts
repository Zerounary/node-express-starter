// utils/RouteLoader.mjs
import fs from "fs/promises";
import path from "path";
import HyperExpress from "hyper-express";
import { getControllerMetadata, getRouteMetadata } from "@/utils/routeDecorators";

export interface RouteLoaderOptions {
  controllerDir?: string;
  prefix?: string;
  middlewares?: any[];
}

export class RouteLoader {
  app: any;
  controllerDir: string;
  prefix: string;
  middlewares: any[];

  constructor(app, options: RouteLoaderOptions = {}) {
    this.app = app;
    this.controllerDir =
      options.controllerDir || path.join(__dirname, "../controllers");
    this.prefix = options.prefix || "/";
    this.middlewares = options.middlewares || [];
  }

  // 加载所有控制器并注册路由
  async load() {
    try {
      const files = await fs.readdir(this.controllerDir);
      
      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          const controllerPath = path.join(this.controllerDir, file);
          await this.registerControllerRoutes(controllerPath);
        }
      }
    } catch (error) {
      console.error("路由加载失败:", error);
    }
  }

  // 仅展示方法体的完整可替换版本
  async registerControllerRoutes(controllerPath) {
    try {
      const { default: ControllerClass } = await import(controllerPath);
      const controllerInstance = new ControllerClass();

      // 获取控制器元数据
      const { prefix: controllerPrefix, middlewares: controllerMiddlewares } = getControllerMetadata(ControllerClass);

      // 获取所有路由元数据
      const routes = getRouteMetadata(ControllerClass);

      const router = new HyperExpress.Router();
      // 从 controllerPrefix 中提取变量并清理
      const variableNames = controllerPrefix.match(/:\w+/g) || [];
      const cleanControllerPrefix = controllerPrefix.replace(/:\w+/g, '').replace(/\/$/, '');
      const mountPath = this.prefix + cleanControllerPrefix;

      // 预合并中间件列表，避免每条路由重复展开的轻微开销（一次性成本）
      const mergedGlobalMiddlewares = this.middlewares || [];
      const mergedControllerMiddlewares = controllerMiddlewares || [];

      // 同步优先的轻量工具
      const isPromiseLike = (v: any) => v !== null && typeof v === 'object' && typeof (v as any).then === 'function';
      const isUwsResponseLike = (v: any) =>
        v && typeof v === 'object' && typeof v.send === 'function' && typeof v.status === 'function';

      for (const route of routes) {
        const routePath = variableNames.join('/') + route.path;
        // 预计算完整路径，避免错误分支再做 path.join
        const fullLogPath = (mountPath + '/' + routePath).replace(/\/+/g, '/');

        // 预先取出并绑定控制器方法，避免请求期的原型链查找
        const target = controllerInstance[route.fnName];
        if (typeof target !== 'function') {
          console.error(`注册路由失败：${fullLogPath} 对应的方法 ${String(route.fnName)} 不是函数`);
          continue;
        }
        const boundHandler = target.bind(controllerInstance);

        // 预生成错误处理器（每条路由一个，避免每次请求创建闭包）
        const onError = (error: any, res: HyperExpress.Response) => {
          console.error(`路由处理错误 (${route.method.toUpperCase()} ${fullLogPath}):`, error);
          // 尽量小对象，减少字符串拼接
          res.status(500).json({
            code: 500,
            msg: '服务器内部错误',
            error: error?.message || String(error),
          });
        };

        // 同步优先的路由处理器：不使用 async/await，减少微任务与状态机开销
        const finalHandler = (req: HyperExpress.Request, res: HyperExpress.Response) => {
          let ret: any;
          try {
            // 窄域 try/catch：只包住调用本身
            ret = boundHandler(req, res);
          } catch (e) {
            onError(e, res);
            return;
          }

          // 控制器如果自己写了响应，建议返回 undefined；保留鸭子类型兜底（不再做跨模块 instanceof）
          if (ret === undefined || ret === null) return;
          if (isUwsResponseLike(ret)) return;

          if (isPromiseLike(ret)) {
            (ret as Promise<any>).then(
              (data) => {
                if (data !== undefined) res.json(data);
              },
              (err) => onError(err, res)
            );
          } else {
            res.json(ret);
          }
        };

        // 注册路由（一次性展开中间件）
        (router[route.method] as (...args: any[]) => void)(
          routePath,
          ...mergedGlobalMiddlewares,
          ...mergedControllerMiddlewares,
          ...(route.middlewares || []),
          finalHandler
        );

        console.log(`注册路由: ${route.method.toUpperCase()} ${fullLogPath}`);
      }

      this.app.use(mountPath, router);
    } catch (error) {
      console.error(`注册控制器路由失败 (${controllerPath}):`, error);
    }
  }
}