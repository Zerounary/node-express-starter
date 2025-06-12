import { Workflow, WorkflowState, WorkflowTransition } from '../db/models/Workflow';
import DynamicTable from '../db/models/DynamicTable';
import DynamicDataService from './DynamicDataService';
import PermissionService from './PermissionService';

class WorkflowService {
    public async executeTransition(tenantId: number, userId: number, tableName: string, recordId: number, actionName: string) {
        // 1. Find the workflow for the table
        const workflow = await Workflow.findOne({
            include: [{ model: DynamicTable, where: { name: tableName, tenantId } }]
        });
        if (!workflow) throw new Error(`No workflow found for table '${tableName}'.`);

        // 2. Get the current record and its state
        const Model = await DynamicDataService.getModelForTable(tableName, tenantId);
        const record = await Model.findByPk(recordId);
        if (!record) throw new Error(`Record with ID ${recordId} not found.`);
        const currentStateName = record.get(workflow.statusField);

        // 3. Find the transition
        const transition = await WorkflowTransition.findOne({
            where: { workflowId: workflow.id, name: actionName },
            include: [{ model: WorkflowState, as: 'fromState' }, { model: WorkflowState, as: 'toState' }]
        });
        if (!transition) throw new Error(`Action '${actionName}' not found in workflow.`);

        // 4. Check if the transition is valid from the current state
        if (transition.fromState.name !== currentStateName) {
            throw new Error(`Action '${actionName}' cannot be performed from current state '${currentStateName}'.`);
        }

        // 5. Check permission for the action (e.g., 'workflow:execute:submit:products')
        const permissionAction = `workflow:execute:${actionName}:${tableName}`;
        const hasPermission = await PermissionService.hasPermission(userId, permissionAction);
        if (!hasPermission) throw new Error(`Forbidden: Missing permission for action: ${permissionAction}`);

        // 6. Perform the state transition
        await record.update({ [workflow.statusField]: transition.toState.name });
        
        return { success: true, newState: transition.toState.name };
    }
}

export default new WorkflowService(); 