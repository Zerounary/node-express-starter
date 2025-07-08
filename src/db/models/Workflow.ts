import { Model, DataTypes, Op } from 'sequelize';
import sequelize from '../sequelize';
import Tenant from './Tenant';
import DynamicTable from './DynamicTable';
import User from './User';

/**
 * Table 1: Workflow
 * Defines a workflow for a specific dynamic table, with priority and filtering conditions.
 */
class Workflow extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public dynamicTableId!: number;
  public priority!: number;
  public dataFilterConditions!: object; // JSONB for storing filter conditions

  public WorkflowStages?: WorkflowStage[];
}
Workflow.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Tenant, key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  dynamicTableId: { type: DataTypes.INTEGER, allowNull: false, references: { model: DynamicTable, key: 'id' } },
  priority: { type: DataTypes.INTEGER, defaultValue: 0 },
  dataFilterConditions: { type: DataTypes.JSON, allowNull: false },
}, { sequelize, tableName: 'workflows' });

/**
 * Table 2: WorkflowStage
 * Defines a stage within a workflow.
 */
class WorkflowStage extends Model {
  public id!: number;
  public workflowId!: number;
  public order!: number;
  public name!: string;
  public minApprovals!: number;
  public minRejections!: number;
  public dataFilterConditions!: object; // JSONB for stage-specific document filters
  public timeoutDays!: number;
  public timeoutAction!: 'approve' | 'reject';

  public approvers?: User[];
}
WorkflowStage.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  workflowId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Workflow, key: 'id' } },
  order: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  minApprovals: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  minRejections: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  dataFilterConditions: { type: DataTypes.JSON },
  timeoutDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  timeoutAction: { type: DataTypes.ENUM('approve', 'reject'), defaultValue: 'reject' },
}, { sequelize, tableName: 'workflow_stages' });

/**
 * Joins table for approvers in a stage (Many-to-Many).
 */
class WorkflowStageApprover extends Model {
    public id!: number;
    public stageId!: number;
    public userId!: number;
}
WorkflowStageApprover.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    stageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: WorkflowStage, key: 'id' } },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id' } },
}, { sequelize, tableName: 'workflow_stage_approvers', timestamps: false });


/**
 * Table 3: WorkflowInstance
 * An instance of a workflow for a specific record.
 */
class WorkflowInstance extends Model {
  public id!: number;
  public workflowId!: number;
  public currentStageId!: number;
  public tableName!: string;
  public recordId!: number;
  public status!: 'pending' | 'approved' | 'rejected' | 'cancelled';
  public lastComment!: string;

  public readonly workflow?: Workflow;
  public readonly currentStage?: WorkflowStage;
}
WorkflowInstance.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  workflowId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Workflow, key: 'id' } },
  currentStageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: WorkflowStage, key: 'id' } },
  tableName: { type: DataTypes.STRING, allowNull: false },
  recordId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'), allowNull: false, defaultValue: 'pending' },
  lastComment: { type: DataTypes.STRING },
}, { sequelize, tableName: 'workflow_instances' });


/**
 * Log of approvals/rejections for a workflow instance.
 */
class WorkflowInstanceLog extends Model {
    public id!: number;
    public instanceId!: number;
    public stageId!: number;
    public userId!: number;
    public action!: 'approve' | 'reject';
    public comment!: string;
}
WorkflowInstanceLog.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    instanceId: { type: DataTypes.INTEGER, allowNull: false, references: { model: WorkflowInstance, key: 'id' } },
    stageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: WorkflowStage, key: 'id' } },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id' } },
    action: { type: DataTypes.ENUM('approve', 'reject'), allowNull: false },
    comment: { type: DataTypes.STRING, allowNull: false },
}, { sequelize, tableName: 'workflow_instance_logs' });


// Associations
Workflow.hasMany(WorkflowStage, { foreignKey: 'workflowId', onDelete: 'CASCADE' });
WorkflowStage.belongsTo(Workflow, { foreignKey: 'workflowId' });

WorkflowStage.belongsToMany(User, { through: WorkflowStageApprover, as: 'approvers', foreignKey: 'stageId' });
User.belongsToMany(WorkflowStage, { through: WorkflowStageApprover, foreignKey: 'userId' });

WorkflowInstance.belongsTo(Workflow, { foreignKey: 'workflowId' });
WorkflowInstance.belongsTo(WorkflowStage, { as: 'currentStage', foreignKey: 'currentStageId' });

WorkflowInstance.hasMany(WorkflowInstanceLog, { foreignKey: 'instanceId' });
WorkflowInstanceLog.belongsTo(WorkflowInstance, { foreignKey: 'instanceId' });
WorkflowInstanceLog.belongsTo(WorkflowStage, { foreignKey: 'stageId' });
WorkflowInstanceLog.belongsTo(User, { foreignKey: 'userId' });


export { Workflow, WorkflowStage, WorkflowStageApprover, WorkflowInstance, WorkflowInstanceLog }; 