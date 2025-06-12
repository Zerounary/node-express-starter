import { Op } from 'sequelize';
import {
    Workflow,
    WorkflowStage,
    WorkflowInstance,
    WorkflowInstanceLog,
} from '../db/models/Workflow';
import DynamicTable from '../db/models/DynamicTable';
import DynamicDataService from './DynamicDataService';
import User from '../db/models/User';

class WorkflowService {

    /**
     * Finds the matching workflow for a record and creates a workflow instance.
     * This should be called after a new record is created in a dynamic table.
     * @param tenantId The tenant ID
     * @param tableName The name of the dynamic table
     * @param recordId The ID of the newly created record
     */
    public async createInstanceForRecord(tenantId: number, tableName: string, recordId: number): Promise<WorkflowInstance | null> {
        const dynamicTable = await DynamicTable.findOne({ where: { name: tableName, tenantId } });
        if (!dynamicTable) return null;

        const record = await (await DynamicDataService.getModelForTable(tableName, tenantId)).findByPk(recordId);
        if (!record) return null;

        const workflows = await Workflow.findAll({
            where: { tenantId, dynamicTableId: dynamicTable.id },
            order: [['priority', 'DESC']],
        });

        let matchedWorkflow = null;
        for (const wf of workflows) {
            // Check if record matches workflow's dataFilterConditions
            const matches = this.checkRecordMatchesFilter(record, wf.dataFilterConditions);
            if (matches) {
                matchedWorkflow = wf;
                break;
            }
        }

        if (!matchedWorkflow) return null;

        const firstStage = await WorkflowStage.findOne({
            where: { workflowId: matchedWorkflow.id },
            order: [['order', 'ASC']],
        });

        if (!firstStage) {
            throw new Error('Workflow has no stages.');
        }

        const instance = await WorkflowInstance.create({
            workflowId: matchedWorkflow.id,
            currentStageId: firstStage.id,
            tableName: tableName,
            recordId: recordId,
            status: 'pending',
        });

        return instance;
    }

    /**
     * Allows a user to approve or reject a workflow instance.
     * @param instanceId The ID of the workflow instance
     * @param userId The ID of the user performing the action
     * @param action 'approve' or 'reject'
     * @param comment A comment for the action
     */
    public async submitAction(instanceId: number, userId: number, action: 'approve' | 'reject', comment: string) {
        const instance = await WorkflowInstance.findByPk(instanceId, {
            include: [{ model: WorkflowStage, as: 'currentStage', include: [{model: User, as: 'approvers'}] }]
        });

        if (!instance) throw new Error('Workflow instance not found.');
        if (instance.status !== 'pending') throw new Error(`Workflow is already ${instance.status}.`);

        const currentStage = instance.currentStage;
        
        // Check if the user is an authorized approver for the current stage
        const isApprover = currentStage.approvers.some(approver => approver.id === userId);
        if (!isApprover) {
            throw new Error('User is not authorized to act on this stage.');
        }

        // Check if user has already acted on this stage
        const existingLog = await WorkflowInstanceLog.findOne({
            where: { instanceId, stageId: currentStage.id, userId }
        });
        if (existingLog) {
            throw new Error(`User has already ${existingLog.action}d this stage.`);
        }

        // Record the action
        await WorkflowInstanceLog.create({
            instanceId,
            stageId: currentStage.id,
            userId,
            action,
            comment
        });

        await instance.update({ lastComment: `${action.toUpperCase()}: ${comment}` });

        // Check if the workflow's state needs to be updated (approved, rejected, or moved to next stage)
        await this.checkAndUpdateWorkflowState(instanceId);
        
        return { success: true, message: 'Action submitted successfully.' };
    }

    /**
     * Gets all workflow instances pending approval for a specific user.
     * @param userId The user's ID
     */
    public async getPendingTasksForUser(userId: number, tenantId: number) {
        // Find all stages where the user is an approver
        const stages = await WorkflowStage.findAll({
            include: [{
                model: User,
                as: 'approvers',
                where: { id: userId },
                attributes: [] // Don't need user attributes here
            }],
            attributes: ['id'],
            raw: true
        });
        const stageIds = stages.map(s => s.id);

        if (stageIds.length === 0) return [];

        // Find all pending workflow instances that are currently at one of those stages
        const instances = await WorkflowInstance.findAll({
            where: {
                currentStageId: { [Op.in]: stageIds },
                status: 'pending'
            },
            include: [
                {
                    model: Workflow,
                    where: { tenantId } // Ensure instance belongs to the correct tenant
                },
                {
                    model: WorkflowStage,
                    as: 'currentStage'
                }
            ]
        });

        return instances;
    }

    /**
     * Checks the state of a workflow instance after an action and updates it if necessary.
     * @param instanceId The ID of the workflow instance
     */
    private async checkAndUpdateWorkflowState(instanceId: number) {
        const instance = await WorkflowInstance.findByPk(instanceId, {
            include: [{ model: Workflow, include: [WorkflowStage] }, { model: WorkflowStage, as: 'currentStage' }]
        });

        const { currentStage } = instance;
        const logs = await WorkflowInstanceLog.findAll({
            where: { instanceId, stageId: currentStage.id }
        });

        const approvals = logs.filter(l => l.action === 'approve').length;
        const rejections = logs.filter(l => l.action === 'reject').length;

        // Check for rejection first
        if (rejections >= currentStage.minRejections) {
            await instance.update({ status: 'rejected' });
            // Optional: Add logic to update the master record's status field
            return;
        }

        // Check for approval
        if (approvals >= currentStage.minApprovals) {
            const allStages = instance.workflow.WorkflowStages.sort((a, b) => a.order - b.order);
            const currentStageIndex = allStages.findIndex(s => s.id === currentStage.id);

            const nextStage = allStages[currentStageIndex + 1];

            if (nextStage) {
                // Move to the next stage
                await instance.update({ currentStageId: nextStage.id });
            } else {
                // This was the final stage, workflow is fully approved
                await instance.update({ status: 'approved' });
                // Optional: Add logic to update the master record's status field
            }
        }
    }

    /**
     * Helper to check if a record's data matches filter conditions.
     * @param record The sequelize model instance of the record
     * @param filter The filter conditions (e.g., { "status": "active", "amount": { "$gt": 100 } })
     */
    private checkRecordMatchesFilter(record: any, filter: object): boolean {
        if (!filter || Object.keys(filter).length === 0) return true; // No filter means it always matches

        for (const field in filter) {
            const condition = filter[field];
            const recordValue = record.get(field);

            if (typeof condition === 'object' && condition !== null) {
                // Handle operators like $gt, $lt, $in, etc.
                for (const operator in condition) {
                    switch (operator) {
                        case '$gt': if (!(recordValue > condition[operator])) return false; break;
                        case '$lt': if (!(recordValue < condition[operator])) return false; break;
                        case '$gte': if (!(recordValue >= condition[operator])) return false; break;
                        case '$lte': if (!(recordValue <= condition[operator])) return false; break;
                        case '$in': if (!condition[operator].includes(recordValue)) return false; break;
                        case '$ne': if (recordValue === condition[operator]) return false; break;
                        default: // Simple equality check for unknown operators
                            if (recordValue != condition[operator]) return false;
                            break;
                    }
                }
            } else {
                // Simple equality check
                if (recordValue != condition) return false;
            }
        }

        return true;
    }
}

export default new WorkflowService(); 