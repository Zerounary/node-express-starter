// utils/RouteDecorators.mjs
import HyperExpress from "hyper-express";

// 路由元数据接口
interface RouteMetadata {
  path: string;
  fnName: string;
  method: keyof HyperExpress.Router;
  middleware?: any[];
}

// 存储控制器类的元数据
const controllerMetadata = new Map<Function, string>();
// 存储方法的路由元数据
const routeMetadata = new Map<Function, RouteMetadata[]>();

// 控制器装饰器 - 定义控制器前缀
export function Controller(prefix: string = "") {
  return function(target: Function) {
    controllerMetadata.set(target, prefix);
  };
}

// HTTP方法装饰器工厂
function createMethodDecorator(method: keyof HyperExpress.Router) {
  return function(path: string = "") {
    return function(target: any, propertyKey: string) {
      // 获取或初始化路由元数据
      const metadata = routeMetadata.get(target.constructor) || [];
      
      metadata.push({
        path,
        method,
        fnName: propertyKey,
        middleware: []
      });
      
      routeMetadata.set(target.constructor, metadata);
    };
  };
}

// 定义HTTP方法装饰器
export const Get = createMethodDecorator("get");
export const Post = createMethodDecorator("post");
export const Put = createMethodDecorator("put");
export const Delete = createMethodDecorator("delete");
export const Patch = createMethodDecorator("patch");

// 中间件装饰器
export function Use(middleware: any) {
  return function(target: any, propertyKey: string) {
    const metadata = routeMetadata.get(target.constructor) || [];
    const route = metadata.find(m => m.path === propertyKey);
    
    if (route) {
      route.middleware.push(middleware);
    } else {
      metadata.push({
        fnName: propertyKey,
        path: propertyKey,
        method: "get", // 默认GET方法
        middleware: [middleware]
      });
      
      routeMetadata.set(target.constructor, metadata);
    }
  };
}

// 获取控制器元数据
export function getControllerMetadata(constructor: Function) {
  return controllerMetadata.get(constructor) || "";
}

// 获取方法路由元数据
export function getRouteMetadata(constructor: Function) {
  return routeMetadata.get(constructor) || [];
}