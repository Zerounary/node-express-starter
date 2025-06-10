import webserver from "./app";
import sequelize from './db/sequelize';
import { initAssets } from "./assets";
import { RouteLoader } from "./utils/routeLoader";
import { start } from "./server";
import DynamicColumn from "./db/models/DynamicColumn";
import DynamicTable from "./db/models/DynamicTable";
import SchemaService from "./services/SchemaService";
import { logError } from "./logger";
import Report from './db/models/Report';


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

        // 同步核心模型
        await DynamicTable.sync({ alter: true });
        await DynamicColumn.sync({ alter: true });
        await Report.sync({ alter: true });
        console.log('Core models synchronized');

        // 初始化动态表
        await initDynamicTables();
        
        // 启动服务器
        start();
    } catch (error) {
        logError(error);
        console.error('Failed to start server:', error);
    }
}

async function initDynamicTables() {
    try {
        console.log('Initializing dynamic tables...');
        let tables = await DynamicTable.findAll({
            raw: true,
        });
        if(tables.length === 0) {
            return
        }

        const queryInterface = sequelize.getQueryInterface();
        const allTables = await queryInterface.showAllTables();

        for (const table of tables) {
            if (!allTables.includes(table.name)) {
                console.log(`Table "${table.name}" not found, creating...`);
                await SchemaService.createTableFromDefinition(table.id);
                console.log(`Table "${table.name}" created.`);
            }
        }
        console.log('Dynamic tables initialized.');
    } catch (error) {
        logError(error);
        console.error('Failed to initialize dynamic tables:', error);
    }
}

bootstrap();
