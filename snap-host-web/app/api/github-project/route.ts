import db from "@/db";
import { deployments, projects } from "@/db/schema";
import { Webhooks } from "@octokit/webhooks";
import { type NextRequest } from "next/server";
import { startDeployment, sendArchiveMessage } from "@/lib/deployment-utils";
import { eq, sql } from "drizzle-orm";

const webhooks = new Webhooks({
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
});

export async function POST(request: NextRequest) {
    try {
        const signature = request.headers.get("x-hub-signature-256");
        const res = await request.text();
        if (!signature || !(await webhooks.verify(res, signature))) {
            return new Response("Unauthorized", { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get("projectId");
        if (!projectId) {
            return new Response("Project ID not specified", { status: 422 });
        }

        const githubEvent = request.headers.get("x-github-event");
        if (githubEvent == "ping") {
            console.log("Ping from ", projectId);
            return new Response("Pong", { status: 200 });
        }

        if (githubEvent == "push") {
            try {
                const project = await db.query.projects.findFirst({
                    where: (projects, { eq, and }) =>
                        and(eq(projects.id, projectId)),
                });

                if (!project) {
                    return new Response("Project not found", { status: 404 });
                }

                const deploymentQuery = await db
                    .insert(deployments)
                    .values({
                        projectId: project.id,
                        status: "QUEUED",
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

                return new Response(
                    JSON.stringify({ deploymentId: deployment.id }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            } catch (error) {
                console.error("Deployment failed:", error);
                return new Response("Deployment failed", { status: 500 });
            }
        }

        return new Response("Event not supported", { status: 400 });
    } catch (error) {
        console.error("Error handling request:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
