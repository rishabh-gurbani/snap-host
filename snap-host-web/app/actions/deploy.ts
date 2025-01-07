"use server";

import db from "@/db";
import { deployments, projects } from "@/db/schema";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-utils";
import { eq, sql } from "drizzle-orm";
import { startDeployment, sendArchiveMessage } from "@/lib/deployment-utils";

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

export async function createDeployment(
    projectId: string,
    buildCommand?: string,
    outDirectory?: string,
    env?: Record<string, string>,
    comments?: string
) {
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

        // Update the project's currentDeploymentId
        await db
            .update(projects)
            .set({
                updatedAt: sql`NOW()`,
                currentDeploymentId: deployment.id,
            })
            .where(eq(projects.id, project.id));

        // Archive previous deployment if exists
        if (project.currentDeploymentId) {
            await sendArchiveMessage(project.id, project.currentDeploymentId);
        }

        await startDeployment(project, deployment.id);

        return {
            success: true as const,
            data: {
                deploymentId: deployment.id,
                url: `http://${project.subDomain}.${process.env.NEXT_PUBLIC_CURRENT_DOMAIN}/`,
            },
        };
    } catch (error) {
        console.log(error);
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to create deployment",
        };
    }
}
