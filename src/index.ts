import webserver from "./app";
import sequelize from './db/sequelize';
import { initAssets } from "./assets";
import { RouteLoader } from "./utils/routeLoader";
import { start } from "./server";
import DynamicColumn from "./db/models/DynamicColumn";
import DynamicTable from "./db/models/DynamicTable";


async function bootstrap() {
    try {
        // 初始化静态资源
        initAssets(webserver);

        // 加载路由
        const routeLoader = new RouteLoader(webserver, {
            controllerDir: "./src/api",
            prefix: "/api",
            middlewares: [],
        });
        routeLoader.load();

        // 同步数据库
        await sequelize.sync({ force: true, alter: true });
        DynamicTable.sync({ force: true, alter: true });
        DynamicColumn.sync({ force: true, alter: true });
        console.log('Database synchronized');

        // 启动服务器
        start();
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

bootstrap();
