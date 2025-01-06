"use server";

import db from "@/db";
import { getServerSession } from "@/lib/auth-utils";

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

        const deploymentLogs = await db.query.logs.findMany({
            where: (logs, { eq }) => eq(logs.deploymentId, deploymentId),
            orderBy: (logs, { asc }) => asc(logs.createdAt),
        });

        return {
            success: true as const,
            data: deploymentLogs.map((log) => ({
                event_id: log.id,
                deployment_id: log.deploymentId,
                log: log.message,
                timestamp: log.createdAt,
                type: log.type,
            })),
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error ? error.message : "Failed to fetch logs",
        };
    }
}
