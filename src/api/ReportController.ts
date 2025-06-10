import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import Report from "../db/models/Report";
import { logError } from "../logger";
import sequelize from "../db/sequelize";
import { QueryTypes } from "sequelize";
import { z } from 'zod';
import Et from 'easytemplatejs'

const reportSchema = z.object({
    name: z.string().min(1),
    sqlTemplate: z.string().min(1),
});

@Controller("/reports")
export default class ReportController {

    @Post("/")
    async create(req, res) {
        try {
            const body = await req.json();
            const validationResult = reportSchema.safeParse(body);
            if (!validationResult.success) {
                return fail(validationResult.error.errors, 400);
            }
            const report = await Report.create(validationResult.data);
            return ok(report);
        } catch (error) {
            logError(error);
            return fail(error.message);
        }
    }

    @Get("/")
    async find(req, res) {
        try {
            const { page = 1, pageSize = 10 } = req.query;
            const nPage = parseInt(page as string, 10);
            const nPageSize = parseInt(pageSize as string, 10);

            const { count, rows } = await Report.findAndCountAll({
                limit: nPageSize,
                offset: (nPage - 1) * nPageSize,
            });

            return ok({
                data: rows,
                pagination: {
                    total: count,
                    page: nPage,
                    pageSize: nPageSize,
                    totalPages: Math.ceil(count / nPageSize),
                }
            });
        } catch (error) {
            logError(error);
            return fail(error.message);
        }
    }

    @Get("/:id")
    async findOne(req, res) {
        try {
            const { id } = req.params;
            const report = await Report.findByPk(id);
            if (!report) {
                return fail("Report not found", 404);
            }
            return ok(report);
        } catch (error) {
            logError(error);
            return fail(error.message);
        }
    }

    @Put("/:id")
    async update(req, res) {
        try {
            const { id } = req.params;
            const body = await req.json();
            const validationResult = reportSchema.safeParse(body);
            if (!validationResult.success) {
                return fail(validationResult.error.errors, 400);
            }

            const [affectedCount] = await Report.update(validationResult.data, { where: { id } });
            if (affectedCount === 0) {
                return fail("Report not found or no changes made", 404);
            }
            return ok({ affectedCount });
        } catch (error) {
            logError(error);
            return fail(error.message);
        }
    }

    @Delete("/:id")
    async remove(req, res) {
        try {
            const { id } = req.params;
            const affectedCount = await Report.destroy({ where: { id } });
            if (affectedCount === 0) {
                return fail("Report not found", 404);
            }
            return ok({ affectedCount });
        } catch (error) {
            logError(error);
            return fail(error.message);
        }
    }

    @Post("/execute/:name")
    async execute(req, res) {
        try {
            const { name } = req.params;
            const { filters = {}, page, pageSize, fetchAll = false } = await req.json();

            const report = (await Report.findOne({ where: { name } }));
            if (!report) {
                return fail("Report not found", 404);
            }

            const { sqlTemplate } = report;
            const renderedSql = Et.template(sqlTemplate, { filters });

            if (fetchAll) {
                const results = await sequelize.query(renderedSql, {
                    replacements: filters,
                    type: QueryTypes.SELECT
                });
                return ok({ data: results });
            }

            const nPage = parseInt(page as string || '1', 10);
            const nPageSize = parseInt(pageSize as string || '10', 10);
            const offset = (nPage - 1) * nPageSize;

            // For pagination, we need a count query and a data query
            const countQuery = `SELECT COUNT(*) as count FROM (${renderedSql}) AS subquery`;
            const countResult: any = await sequelize.query(countQuery, {
                replacements: filters,
                type: QueryTypes.SELECT,
                plain: true
            });
            const total = parseInt(countResult.count, 10);

            const dataQuery = `${renderedSql} LIMIT :limit OFFSET :offset`;
            const results = await sequelize.query(dataQuery, {
                replacements: { ...filters, limit: nPageSize, offset },
                type: QueryTypes.SELECT
            });
            
            return ok({
                data: results,
                pagination: {
                    total: total,
                    page: nPage,
                    pageSize: nPageSize,
                    totalPages: Math.ceil(total / nPageSize),
                }
            });

        } catch (error) {
            logError(error);
            return fail(error.message);
        }
    }
} 