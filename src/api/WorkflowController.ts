import { Controller, Post, Get, Put, Delete } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { logError } from "../logger";
import { Workflow, WorkflowStage, WorkflowStageApprover } from "../db/models/Workflow";
import User from "../db/models/User";
import { z } from 'zod';
import sequelize from "@/db/sequelize";
import WorkflowService from "@/services/WorkflowService";

// Validation schema for a single approver
const approverSchema = z.object({
    id: z.number(),
});

// Validation schema for a single stage
const stageSchema = z.object({
    id: z.number().optional(), // ID is optional for new stages
    name: z.string(),
    order: z.number(),
    minApprovals: z.number().min(1),
    minRejections: z.number().min(1),
    timeoutDays: z.number().min(0).default(0),
    timeoutAction: z.enum(['approve', 'reject']).default('reject'),
    approvers: z.array(approverSchema),
});

// Validation schema for the entire workflow
const workflowSchema = z.object({
    name: z.string(),
    dynamicTableId: z.number(),
    priority: z.number().default(0),
    dataFilterConditions: z.record(z.any()), // Allows any JSON object
    stages: z.array(stageSchema),
});

const actionSchema = z.object({
    comment: z.string(),
});

@Controller("/workflows")
export default class WorkflowController {

    /**
     * Comprehensive endpoint to create or update a workflow and its stages.
     */
    @Post("/upsert")
    async upsertWorkflow(req, res) {
        const { tenantId } = req.user;
        const transaction = await sequelize.transaction();
        try {
            const data = workflowSchema.parse(await req.json());

            const workflowData = {
                name: data.name,
                dynamicTableId: data.dynamicTableId,
                priority: data.priority,
                dataFilterConditions: data.dataFilterConditions,
                tenantId: tenantId,
            };

            // Check for existing workflow to decide whether to create or update
            const existingWorkflow = await Workflow.findOne({ where: { dynamicTableId: data.dynamicTableId, tenantId } });
            
            let workflow;
            if (existingWorkflow) {
                workflow = await existingWorkflow.update(workflowData, { transaction });
                // If updating, first clear existing stages and approvers
                await WorkflowStage.destroy({ where: { workflowId: workflow.id }, transaction });
            } else {
                workflow = await Workflow.create(workflowData, { transaction });
            }


            for (const stageData of data.stages) {
                const stage = await WorkflowStage.create({
                    workflowId: workflow.id,
                    name: stageData.name,
                    order: stageData.order,
                    minApprovals: stageData.minApprovals,
                    minRejections: stageData.minRejections,
                    timeoutDays: stageData.timeoutDays,
                    timeoutAction: stageData.timeoutAction,
                }, { transaction });

                if (stageData.approvers && stageData.approvers.length > 0) {
                    const approverLinks = stageData.approvers.map(approver => ({
                        stageId: stage.id,
                        userId: approver.id,
                    }));
                    await WorkflowStageApprover.bulkCreate(approverLinks, { transaction });
                }
            }

            await transaction.commit();
            return ok(workflow);
        } catch (error) {
            await transaction.rollback();
            logError(error);
            return fail(error.message, 400);
        }
    }

    @Get("/")
    async getAllWorkflows(req, res) {
        const { tenantId } = req.user;
        const workflows = await Workflow.findAll({
            where: { tenantId },
            include: [{
                model: WorkflowStage,
                include: [{ model: User, as: 'approvers', attributes: ['id', 'username'] }]
            }],
            order: [
                ['priority', 'DESC'],
                [WorkflowStage, 'order', 'ASC']
            ]
        });
        return ok(workflows);
    }
    
    @Get("/tasks")
    async getMyTasks(req, res) {
        try {
            const { id: userId, tenantId } = req.user;
            const tasks = await WorkflowService.getPendingTasksForUser(userId, tenantId);
            return ok(tasks);
        } catch (error) {
            logError(error);
            return fail(error.message, 500);
        }
    }

    @Post("/instances/:instanceId/approve")
    async approveTask(req, res) {
        try {
            const { id: userId } = req.user;
            const { instanceId } = req.params;
            const { comment } = actionSchema.parse(await req.json());
            const result = await WorkflowService.submitAction(parseInt(instanceId, 10), userId, 'approve', comment);
            return ok(result);
        } catch (error) {
            logError(error);
            return fail(error.message, 400);
        }
    }

    @Post("/instances/:instanceId/reject")
    async rejectTask(req, res) {
        try {
            const { id: userId } = req.user;
            const { instanceId } = req.params;
            const { comment } = actionSchema.parse(await req.json());
            const result = await WorkflowService.submitAction(parseInt(instanceId, 10), userId, 'reject', comment);
            return ok(result);
        } catch (error) {
            logError(error);
            return fail(error.message, 400);
        }
    }
    
    @Delete("/:id")
    async deleteWorkflow(req, res) {
        const { tenantId } = req.user;
        const { id } = req.params;
        const transaction = await sequelize.transaction();
        try {
            const workflow = await Workflow.findOne({ where: { id, tenantId } });
            if (!workflow) {
                return fail("Workflow not found", 404);
            }
            // Deleting the workflow will cascade delete stages due to model association
            await workflow.destroy({ transaction });

            await transaction.commit();
            return ok({ success: true, message: 'Workflow deleted' });
        } catch(error) {
            await transaction.rollback();
            logError(error);
            return fail(error.message, 500);
        }
    }
} 