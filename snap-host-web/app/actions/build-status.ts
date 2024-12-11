"use server";

import db from "@/db";
import { getServerSession } from "@/lib/auth-utils";

export async function getBuildStatus(deploymentId: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const deployment = await db.query.deployments.findFirst({
            where: (deployments, { eq }) => eq(deployments.id, deploymentId),
            with: {
                project: {
                    columns: {
                        subDomain: true,
                    },
                    // @ts-expect-error drizzle
                    where: (project, { eq }) =>
                        eq(project.userId, session.user.id),
                },
            },
        });

        if (!deployment) {
            throw new Error("Deployment not found or unauthorized");
        }

        return {
            success: true as const,
            data: deployment,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch build status",
        };
    }
}
