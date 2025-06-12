import { Model, DataTypes } from 'sequelize';
import sequelize from '../sequelize';
import Tenant from './Tenant';
import DynamicTable from './DynamicTable';

// Workflow definition
class Workflow extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public dynamicTableId!: number;
  public statusField!: string;
}
Workflow.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Tenant, key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  dynamicTableId: { type: DataTypes.INTEGER, allowNull: false, references: { model: DynamicTable, key: 'id' } },
  statusField: { type: DataTypes.STRING, allowNull: false },
}, { sequelize, tableName: 'workflows', indexes: [{ unique: true, fields: ['tenantId', 'dynamicTableId'] }] });

// State within a workflow
class WorkflowState extends Model {
  public id!: number;
  public workflowId!: number;
  public name!: string;
  public isInitial!: boolean;
}
WorkflowState.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  workflowId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Workflow, key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  isInitial: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, tableName: 'workflow_states', timestamps: false });

// Transition between states
class WorkflowTransition extends Model {
  public id!: number;
  public workflowId!: number;
  public name!: string; // The action name, e.g., "submit", "approve"
  public fromStateId!: number;
  public toStateId!: number;
  
  public fromState?: WorkflowState;
  public toState?: WorkflowState;
}
WorkflowTransition.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  workflowId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Workflow, key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  fromStateId: { type: DataTypes.INTEGER, allowNull: false, references: { model: WorkflowState, key: 'id' } },
  toStateId: { type: DataTypes.INTEGER, allowNull: false, references: { model: WorkflowState, key: 'id' } },
}, { sequelize, tableName: 'workflow_transitions', timestamps: false });

// Associations
Workflow.hasMany(WorkflowState, { foreignKey: 'workflowId' });
WorkflowState.belongsTo(Workflow, { foreignKey: 'workflowId' });
Workflow.hasMany(WorkflowTransition, { foreignKey: 'workflowId' });
WorkflowTransition.belongsTo(Workflow, { foreignKey: 'workflowId' });
WorkflowTransition.belongsTo(WorkflowState, { as: 'fromState', foreignKey: 'fromStateId' });
WorkflowTransition.belongsTo(WorkflowState, { as: 'toState', foreignKey: 'toStateId' });

export { Workflow, WorkflowState, WorkflowTransition }; 