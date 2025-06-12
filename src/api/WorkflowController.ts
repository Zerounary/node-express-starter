import { Controller, Post, Get } from "@/utils/routeDecorators";
import { ok, fail } from "@/router/api";
import { logError } from "../logger";
import { Workflow, WorkflowState, WorkflowTransition } from "../db/models/Workflow";
import { z } from 'zod';

const workflowSchema = z.object({
    name: z.string(),
    dynamicTableId: z.number(),
    statusField: z.string(),
});
const stateSchema = z.object({
    workflowId: z.number(),
    name: z.string(),
    isInitial: z.boolean().optional(),
});
const transitionSchema = z.object({
    workflowId: z.number(),
    name: z.string(),
    fromStateId: z.number(),
    toStateId: z.number(),
});

@Controller("/workflows")
export default class WorkflowController {
    // Workflow CRUD
    @Post("/")
    async createWorkflow(req, res) {
        // Validation, tenancy check, creation...
        const { tenantId } = req.user;
        const data = workflowSchema.parse(await req.json());
        const workflow = await Workflow.create({ ...data, tenantId });
        return ok(workflow);
    }
    // ... other workflow CRUD methods

    // State CRUD
    @Post("/states")
    async createState(req, res) {
        // Validation, tenancy check (via workflowId), creation...
        const data = stateSchema.parse(await req.json());
        // TODO: Check if workflow belongs to user's tenant
        const state = await WorkflowState.create(data);
        return ok(state);
    }
    // ... other state CRUD methods

    // Transition CRUD
    @Post("/transitions")
    async createTransition(req, res) {
        // Validation, tenancy check (via workflowId), creation...
        const data = transitionSchema.parse(await req.json());
        // TODO: Check if workflow belongs to user's tenant
        const transition = await WorkflowTransition.create(data);
        return ok(transition);
    }
    // ... other transition CRUD methods
} 