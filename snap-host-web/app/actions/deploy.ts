"use server";

import db from "@/db";
import { deployments, projects } from "@/db/schema";
import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { ecsClient, CONFIG } from "@/lib/aws-client";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-utils";
import { eq, sql } from "drizzle-orm";

const deploymentSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
});

export async function getDeployments(projectId: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const validation = deploymentSchema.safeParse({ projectId });
        if (!validation.success) {
            throw new Error(validation.error.errors[0].message);
        }

        const projectDeployments = await db.query.deployments.findMany({
            where: (deployment, { eq }) => eq(deployment.projectId, projectId),
            orderBy: (deployment, { desc }) => desc(deployment.createdAt),
        });

        return {
            success: true as const,
            data: projectDeployments,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch deployments",
        };
    }
}

export async function createDeployment(projectId: string, comments?: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const validation = deploymentSchema.safeParse({ projectId });
        if (!validation.success) {
            throw new Error(validation.error.errors[0].message);
        }

        const project = await db.query.projects.findFirst({
            where: (projects, { eq, and }) =>
                and(
                    eq(projects.id, projectId),
                    eq(projects.userId, session.user.id)
                ),
        });

        if (!project) throw new Error("Project not found or unauthorized");

        const deploymentQuery = await db
            .insert(deployments)
            .values({
                projectId: project.id,
                status: "QUEUED",
                comments: comments,
            })
            .returning();

        const deployment = deploymentQuery[0];

        const command = new RunTaskCommand({
            cluster: CONFIG.CLUSTER,
            taskDefinition: CONFIG.TASK,
            count: 1,
            launchType: "FARGATE",
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: [
                        "subnet-0a7061cd0b42c9e20",
                        "subnet-09ca23335f0d3b776",
                        "subnet-08d202097ed2a7c10",
                    ],
                    securityGroups: ["sg-04bc809e564080619"],
                    assignPublicIp: "ENABLED",
                },
            },
            overrides: {
                containerOverrides: [
                    {
                        name: "builder-image",
                        environment: [
                            {
                                name: "GIT_REPOSITORY_URL",
                                value: project.gitURL!,
                            },
                            { name: "PROJECT_ID", value: project.subDomain! },
                            { name: "DEPLOYMENT_ID", value: deployment.id },
                            // AWS credentials
                            {
                                name: "AWS_ACCESS_KEY_ID",
                                value: process.env.AWS_ACCESS_KEY_ID,
                            },
                            {
                                name: "AWS_SECRET_ACCESS_KEY",
                                value: process.env.AWS_SECRET_ACCESS_KEY,
                            },
                            {
                                name: "AWS_REGION",
                                value: process.env.AWS_REGION,
                            },
                            // Kafka credentials
                            {
                                name: "KAFKA_BROKER",
                                value: process.env.KAFKA_BROKER,
                            },
                            {
                                name: "KAFKA_USERNAME",
                                value: process.env.KAFKA_USERNAME,
                            },
                            {
                                name: "KAFKA_PASSWORD",
                                value: process.env.KAFKA_PASSWORD,
                            },
                        ],
                    },
                ],
            },
        });

        await ecsClient.send(command);

        await db
            .update(projects)
            .set({ updatedAt: sql`NOW()` })
            .where(eq(projects.id, project.id));

        return {
            success: true as const,
            data: {
                deploymentId: deployment.id,
                url: `http://${project.subDomain}.${process.env.NEXT_PUBLIC_CURRENT_DOMAIN}/`,
            },
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to create deployment",
        };
    }
}
