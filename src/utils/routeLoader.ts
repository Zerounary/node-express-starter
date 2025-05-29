// utils/RouteLoader.mjs
import fs from "fs";
import path from "path";
import HyperExpress from "hyper-express";

export interface RouteLoaderOptions {
  controllerDir?: string; // 控制器目录
  prefix?: string; // 全局路由前缀
  middlewares?: any[]; // 全局中间件
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
      const files = fs.readdirSync(this.controllerDir);
      
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
      const ControllerClass = require(controllerPath).default;
      const controllerInstance = new ControllerClass();
      const controllerName = path.basename(controllerPath, path.extname(controllerPath));

      // 获取控制器的所有方法
      const methods = Object.getOwnPropertyNames(ControllerClass.prototype)
        .filter(method => method !== "constructor" && typeof controllerInstance[method] === "function");

      const router = new HyperExpress.Router();
      
      methods.forEach(method => {
        // 解析HTTP方法和路径
        const { httpMethod, path } = this.parseRouteInfo(controllerName, method);
        
        // 注册路由，添加返回值处理中间件
        router[httpMethod](path, 
          ...this.middlewares, 
          async (req, res) => {
            try {
              // 执行控制器方法
              const result = await controllerInstance[method](req, res);
              
              // 处理返回值
              if (result !== undefined) {
                // 如果是响应对象，直接返回
                if (result instanceof HyperExpress.Response) {
                  return result;
                }
                
                // 否则序列化为JSON
                res.json(result);
              }
            } catch (error) {
              console.error(`路由处理错误 (${httpMethod.toUpperCase()} ${path}):`, error);
              res.status(500).json({
                code: 500,
                msg: "服务器内部错误",
                error: error.message
              });
            }
          }
        );
      });
      
      this.app.use(this.prefix, router);
    } catch (error) {
      console.error(`注册控制器路由失败 (${controllerPath}):`, error);
    }
  }


  // 解析路由信息（HTTP方法和路径）
  parseRouteInfo(controllerName, methodName) {
    // 默认使用GET方法
    let httpMethod = "get";
    let path = `/${controllerName}/${methodName}`;

    // 支持在方法名中指定HTTP方法
    // 例如: postCreateUser 将映射为 POST /user/createUser
    const methodPrefixes = ["get", "post", "put", "delete", "patch"];
    const match = methodName.match(
      new RegExp(`^(${methodPrefixes.join("|")})(.+)`)
    );

    if (match) {
      httpMethod = match[1].toLowerCase();
      // 将驼峰命名转换为kebab-case路径
      const routePath = match[2].replace(/([A-Z])/g, "-$1").toLowerCase();
      path = `/${controllerName}/${routePath}`;
    }

    return { httpMethod, path };
  }
}
