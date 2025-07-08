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

  // 注册单个控制器的所有路由
  async registerControllerRoutes(controllerPath) {
    try {
      const { default: ControllerClass } = await import(controllerPath);
      const controllerInstance = new ControllerClass();
      
      // 获取控制器元数据 (prefix and middlewares)
      const { prefix: controllerPrefix, middlewares: controllerMiddlewares } = getControllerMetadata(ControllerClass);
      
      // 获取所有路由元数据
      const routes = getRouteMetadata(ControllerClass);
      
      const router = new HyperExpress.Router();
      // 获取 controllerPrefix 中类似 :tableName 的变量，并转成字符串数组
      const variableNames = controllerPrefix.match(/:\w+/g) || [];

      // controllerPrefix 移除变量
      const cleanControllerPrefix = controllerPrefix.replace(/:\w+/g, '').replace(/\/$/, '');

      //
      const mountPath = this.prefix + cleanControllerPrefix;
      
      // 注册每个路由
      routes.forEach(route => {
        const routePath = variableNames.join('/') + route.path; // Path is now relative to the controller's mount path
        
        // 注册路由，添加返回值处理中间件
        (router[route.method] as (...args: any[]) => void)(routePath, 
          ...this.middlewares, // Global middlewares
          ...(controllerMiddlewares || []), // Controller-level middlewares
          ...(route.middlewares || []), // Route-level middlewares
          async (req, res) => {
            try {
              // 执行控制器方法
              const result = await controllerInstance[route.fnName](req, res);
              
              // 处理返回值
              if (result !== undefined) {
                if (result instanceof HyperExpress.Response) {
                  return result;
                }
                
                res.json(result);
              }
            } catch (error) {
              const fullErrorPath = path.join(mountPath, routePath).replace(/\\\\/g, '/');
              console.error(`路由处理错误 (${route.method.toUpperCase()} ${fullErrorPath}):`, error);
              res.status(500).json({
                code: 500,
                msg: "服务器内部错误",
                error: error.message
              });
            }
          }
        );
        
        const fullLogPath = path.join(mountPath, routePath).replace(/\\\\/g, '/');
        console.log(`注册路由: ${route.method.toUpperCase()} ${fullLogPath}`);
      });
      
      this.app.use(mountPath, router);
    } catch (error) {
      console.error(`注册控制器路由失败 (${controllerPath}):`, error);
    }
  }
}