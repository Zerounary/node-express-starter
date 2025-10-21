import { Controller, Get, Post, Delete } from "@/utils/routeDecorators";
import { scheduleService } from "@/services/scheduleService";
import { fail, ok } from "@/router/api";

@Controller("/schedule")
export default class ScheduleController {

    @Get("/")
    async listJobs() {
        return scheduleService.getScheduledJobs();
    }

    @Post("/")
    async createJob(req) {
        const { name, cron } = await req.json();
        if (!name || !cron) {
            return fail("Missing name or cron expression" );
        }

        // The actual task to be executed
        const task = () => {
            console.log(`Executing job: ${name} at ${new Date()}`);
            // Add your task logic here, e.g., call another service, send an email, etc.
        };

        const job = scheduleService.scheduleJob(name, cron, task);

        if (job) {
            return ok({
                message: "Job scheduled successfully",
                name: job.name,
                nextInvocation: job.nextInvocation()?.toISOString() || null
            });
        } else {
            return fail(`Job with name '${name}' already exists.` );
        }
    }

    @Delete("/:name")
    async cancelJob(req) {
        const { name } = req.params;
        const success = scheduleService.cancelJob(name);
        if (success) {
            return ok({ message: `Job '${name}' cancelled successfully.` });
        } else {
            return fail(`Job with name '${name}' not found.`, 404);
        }
    }
}