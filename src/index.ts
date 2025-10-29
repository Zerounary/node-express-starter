import webserver from "./app";
import { initAssets } from "./assets";
import { RouteLoader } from "./utils/routeLoader";
import { start } from "./server";
import DynamicColumn from "./db/models/DynamicColumn";
import { Media, MediaCategory, TableCategory } from "./db/models";
import DynamicTable from "./db/models/DynamicTable";
import { logError } from "./logger";
import Report from './db/models/Report';
import User from './db/models/User';
import ActionLog from './db/models/ActionLog';
import Tenant from './db/models/Tenant';
import { authMiddleware } from "./router/auth";
import { logMiddleware } from "./router/middlewares/logMiddleware";
import { Permission, Role, RolePermissions, UserRoles } from "./db/models/Role";
import { Workflow, WorkflowStage, WorkflowStageApprover, WorkflowInstance, WorkflowInstanceLog } from './db/models/Workflow';
import { initAdminUser, initSystemData, initTableCategories } from "./db/init";
import CacheService from "./services/CacheService";
import { DataScope } from "./db/models/DataScope";
import { initDynamicTables } from "./services/utils/dynamic";
import Region from "./db/models/Region";
import { TableAction } from "./db/models/TableAction";
import Member from "./db/models/Member";


async function bootstrap() {
    try {
        // 初始化静态资源
        initAssets(webserver);
        
        // // Add user to the request context
        // webserver.use((req, res, next) => {
        //     // req.user = null;
        //     next();
        // });

        // Register auth middleware
        webserver.use(authMiddleware);

        // 加载路由
        const routeLoader = new RouteLoader(webserver, {
            controllerDir: "./src/api",
            prefix: "/api",
            middlewares: [],
        });
        await routeLoader.load();

        // Register log middleware after routes are loaded
        webserver.use(logMiddleware);

        // 同步核心模型
        await Tenant.sync({ alter: true });
        await User.sync({ alter: true });
        await Member.sync({ alter: true });
        await ActionLog.sync({ alter: true });
        await TableCategory.sync({ alter: true });
        await DynamicTable.sync({ alter: true });
        await DynamicColumn.sync({ alter: true });
        await Report.sync({ alter: true });
        await Workflow.sync({ alter: true });
        await WorkflowStage.sync({ alter: true });
        await WorkflowStageApprover.sync({ alter: true });
        await WorkflowInstance.sync({ alter: true });
        await WorkflowInstanceLog.sync({ alter: true });
        await Role.sync({ alter: true });
        await Permission.sync({ alter: true});
        await DataScope.sync({ alter: true});
        await RolePermissions.sync({ alter: true});
        await UserRoles.sync({ alter: true});
        await MediaCategory.sync({ alter: true });
        await Media.sync({ alter: true });
        await Region.sync({ alter: true });
        await TableAction.sync({ alter: true });

        console.log('Core models synchronized');

        // 初始化系统管理用户
        await initAdminUser();
        // 初始化表类别
        await initTableCategories();
        // 初始化系统结构数据
        await initSystemData();

        // 初始化动态表
        await initDynamicTables();

        // 初始化缓存
        console.log('Initializing cache...');
        await CacheService.initialize();
        console.log('Cache initialized.');
        
        // 启动服务器
        start();
    } catch (error) {
        logError(error);
        console.error('Failed to start server:', error);
    }
}

bootstrap();
