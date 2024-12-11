"use server";

import db from "@/db";
import { getServerSession } from "@/lib/auth-utils";
import { createClient } from "@clickhouse/client";

const clickhouseClient = createClient({
    url: process.env.CLICKHOUSE_URL,
    database: process.env.CLICKHOUSE_DATABASE,
});

export async function getDeploymentLogs(deploymentId: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const deployment = await db.query.deployments.findFirst({
            where: (deployments, { eq }) => eq(deployments.id, deploymentId),
            with: {
                project: {
                    // @ts-expect-error drizzle 
                    where: (project, { eq }) =>
                        eq(project.userId, session.user.id),
                },
            },
        });

        if (!deployment) {
            throw new Error("Deployment not found or unauthorized");
        }

        const logs = await clickhouseClient.query({
            query: `SELECT event_id, deployment_id, log, timestamp 
                   FROM log_events 
                   WHERE deployment_id = {deployment_id:String} 
                   ORDER BY timestamp`,
            query_params: {
                deployment_id: deploymentId,
            },
            format: "JSONEachRow",
        });

        const rawLogs = await logs.json();

        return {
            success: true as const,
            data: rawLogs,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error ? error.message : "Failed to fetch logs",
        };
    }
}
