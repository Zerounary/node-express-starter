import { Controller, Post, Get } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { logError } from "../logger";
import sequelize from "../db/sequelize";
import DocumentType from "../db/models/DocumentType";
import DynamicDataService from "../services/DynamicDataService";
import { z } from 'zod';

const documentSchema = z.object({
    header: z.record(z.any()),
    details: z.array(z.record(z.any())),
});

@Controller("/documents/:docTypeName")
export default class DocumentController {

    @Post("/")
    async create(req, res) {
        const { docTypeName } = req.params;
        const { tenantId } = req.user;
        let transaction;

        try {
            const body = await req.json();
            const validationResult = documentSchema.safeParse(body);
            if (!validationResult.success) {
                return fail(validationResult.error.errors, 400);
            }

            const docType = await DocumentType.findOne({ 
                where: { name: docTypeName, tenantId },
                include: ['mainTable', 'detailTable']
            });

            if (!docType) {
                return fail(`Document type '${docTypeName}' not found.`, 404);
            }

            const { header, details } = validationResult.data;
            header.tenantId = tenantId;
            // Set initial state
            header.documentStatus = docType.states[0]; 

            const MainModel = await DynamicDataService.getModelForTable(docType.mainTable!.name, tenantId);
            const DetailModel = await DynamicDataService.getModelForTable(docType.detailTable!.name, tenantId);
            
            transaction = await sequelize.transaction();

            const mainRecord = await MainModel.create(header, { transaction });

            const detailRecords = details.map(d => ({
                ...d,
                tenantId: tenantId,
                [`${docType.mainTable!.name}Id`]: (mainRecord as any).id
            }));
            await DetailModel.bulkCreate(detailRecords, { transaction });

            await transaction.commit();

            return ok({ id: (mainRecord as any).id });

        } catch (error) {
            if (transaction) await transaction.rollback();
            logError(error);
            return fail(error.message);
        }
    }
    
    // 省略 find, findOne, update 等方法的实现
} 