import { Controller, Post, Get, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import DocumentType from "../db/models/DocumentType";
import { logError } from "../logger";
import { z } from 'zod';

const docTypeSchema = z.object({
    name: z.string().min(1),
    mainTableId: z.number().int(),
    detailTableId: z.number().int(),
    states: z.array(z.string()).min(1),
});

@Controller("/document-types")
export default class DocumentTypeController {

    @Post("/")
    async create(req, res) {
        try {
            const { tenantId } = req.user;
            const body = await req.json();
            const validationResult = docTypeSchema.safeParse(body);
            if (!validationResult.success) {
                return fail(validationResult.error.errors, 400);
            }
            const docType = await DocumentType.create({ ...validationResult.data, tenantId });
            return ok(docType);
        } catch (error) {
            logError(error);
            return fail(error.message);
        }
    }

    @Get("/")
    async find(req, res) {
        try {
            const { tenantId } = req.user;
            const docTypes = await DocumentType.findAll({ where: { tenantId } });
            return ok(docTypes);
        } catch (error) {
            logError(error);
            return fail(error.message);
        }
    }

    // 省略 findOne, update, delete 的类似实现...
} 