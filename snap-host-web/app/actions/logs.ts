"use server";

import db from "@/db";
import { getServerSession } from "@/lib/auth-utils";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});
const BUCKET_NAME = "snap-host";

async function getS3Logs(projectId: string, deploymentId: string) {
    const s3Key = `__logs__/${projectId}/${deploymentId}/build-logs.json`;
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
    });

    const response = await s3Client.send(command);
    const logsString = await response.Body?.transformToString();
    return JSON.parse(logsString || "[]");
}

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

        let logs;
        if (deployment.logsArchived) {
            // Fetch logs from S3
            logs = await getS3Logs(deployment.projectId, deploymentId);
            return {
                success: true as const,
                data: logs.map((log: any) => ({
                    event_id: log.eventId,
                    deployment_id: deploymentId,
                    log: log.message,
                    timestamp: new Date(log.timestamp),
                    type: log.type,
                })),
            };
        } else {
            // Fetch logs from database
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
        }
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error ? error.message : "Failed to fetch logs",
        };
    }
}
