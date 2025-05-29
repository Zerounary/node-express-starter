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
  middlewares: any;
  constructor(app, options :RouteLoaderOptions = {}) {
    this.app = app;
    this.controllerDir =
      options.controllerDir || path.join(__dirname, "../controllers");
    this.prefix = options.prefix || "/";
    this.middlewares = options.middlewares || [];
  }

  // 加载所有控制器并注册路由
  load() {
    const files = fs.readdirSync(this.controllerDir);

    files.forEach((file) => {
      if (file.endsWith(".ts")) {
        const controllerPath = path.join(this.controllerDir, file);
        this.registerControllerRoutes(controllerPath);
      }
    });
    const router = new HyperExpress.Router();
    router.get('/test', () => "ok")
    this.app.use('/', router)
  }

  // 注册单个控制器的所有路由
  registerControllerRoutes(controllerPath) {
    const ControllerClass = require(controllerPath).default;
    const controllerInstance = new ControllerClass();
    const controllerName = path.basename(controllerPath, ".ts");

    // 获取控制器的所有方法
    const methods = Object.getOwnPropertyNames(
      ControllerClass.prototype
    ).filter((method) => method !== "constructor");

    const router = new HyperExpress.Router();
    methods.forEach((method) => {
      // 解析HTTP方法和路径
      const { httpMethod, path } = this.parseRouteInfo(controllerName, method);
      console.log('🚀 ~ RouteLoader ~ methods.forEach ~ httpMethod, path:', httpMethod, path)
      console.log('🚀 ~ RouteLoader ~ methods.forEach ~ controllerName, method:', controllerName, method)
        // 注册路由
        router[httpMethod](
          path,
          controllerInstance[method].bind(controllerInstance)
        );
    });
    console.log('router', router)
    console.log('🚀 ~ RouteLoader ~ registerControllerRoutes ~ this.app:', this.app)
    this.app.use(this.prefix, router);
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
