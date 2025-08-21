import { Request, Response } from 'express';
import CacheService from '../services/CacheService';
import logger from '../logger';
import {logError} from '../logger';
import { Controller, Post } from '@/utils/routeDecorators';
import { checkPermission } from '@/router/middlewares/permissionMiddleware';

@Controller("/cache")
export default class CacheController {

    @Post("/reload", [checkPermission('data:cache:reload')])
    public async reloadCache(req: Request, res: Response) {
        const { tableName } = req.body; // Expecting physical table name

        if (!tableName || typeof tableName !== 'string') {
            return res.status(400).json({ message: 'tableName is required in the request body.' });
        }

        try {
            logger.info(`Manual cache reload request for table: ${tableName}`);
            await CacheService.reloadTable(tableName);
            return res.status(200).json({ message: `Cache for table '${tableName}' reloaded successfully.` });
        } catch (error) {
            logError(error);
            return res.status(500).json({ message: `Failed to reload cache for table '${tableName}'.`, error: (error as Error).message });
        }
    }

    @Post("/reloadAll", [checkPermission('data:cache:reloadAll')])
    public async reloadAllCache(req: Request, res: Response) {
        try {
            logger.info('Manual full cache reload request.');
            await CacheService.loadAllTables();
            return res.status(200).json({ message: 'All caches reloaded successfully.' });
        } catch (error) {
            logError(error);
            return res.status(500).json({ message: 'Failed to reload all caches.', error: (error as Error).message });
        }
    }
}