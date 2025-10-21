import * as schedule from 'node-schedule';

class ScheduleService {
    private jobs: Map<string, schedule.Job> = new Map();

    constructor() {
        // You can load persisted jobs from a database here if needed
    }

    scheduleJob(name: string, cron: string, task: () => void): schedule.Job | null {
        if (this.jobs.has(name)) {
            // Job with the same name already exists
            return null;
        }

        const job = schedule.scheduleJob(name, cron, task);
        if (job) {
            this.jobs.set(name, job);
        }
        return job;
    }

    cancelJob(name: string): boolean {
        const job = this.jobs.get(name);
        if (job) {
            job.cancel();
            this.jobs.delete(name);
            return true;
        }
        return false;
    }

    getScheduledJobs() {
        const jobDetails = [];
        for (const [name, job] of this.jobs.entries()) {
            jobDetails.push({
                name,
                nextInvocation: job.nextInvocation()?.toISOString() || null,
            });
        }
        return jobDetails;
    }

    getJob(name: string): schedule.Job | undefined {
        return this.jobs.get(name);
    }
}

// Export a singleton instance
export const scheduleService = new ScheduleService();