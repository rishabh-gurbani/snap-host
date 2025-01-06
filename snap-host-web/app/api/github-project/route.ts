import db from "@/db";
import { deployments } from "@/db/schema";
import { CONFIG, ecsClient } from "@/lib/aws-client";
import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { Webhooks } from "@octokit/webhooks";
import { type NextRequest } from "next/server";

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
                                    {
                                        name: "PROJECT_ID",
                                        value: project.subDomain!,
                                    },
                                    {
                                        name: "DEPLOYMENT_ID",
                                        value: deployment.id,
                                    },
                                    // AWS credentials
                                    {
                                        name: "AWS_ACCESS_KEY_ID",
                                        value: process.env.AWS_ACCESS_KEY_ID,
                                    },
                                    {
                                        name: "AWS_SECRET_ACCESS_KEY",
                                        value: process.env
                                            .AWS_SECRET_ACCESS_KEY,
                                    },
                                    {
                                        name: "AWS_REGION",
                                        value: process.env.AWS_REGION,
                                    },
                                    {
                                        name: "SQS_QUEUE_URL",
                                        value: process.env.SQS_QUEUE_URL,
                                    },
                                ],
                            },
                        ],
                    },
                });

                await ecsClient.send(command);
                console.log("Deployment started:", deployment.id);
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
