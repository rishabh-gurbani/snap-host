import { Project } from "@/db/schema";
import { CONFIG, ecsClient } from "@/lib/aws-client";
import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import Docker from "dockerode";

const sqsClient = new SQSClient({});

const MESSAGE_GROUPS = {
    BUILD_UPDATES: "build-updates",
    DEPLOYMENT_ARCHIVE: "deployment-archive",
};

export async function sendArchiveMessage(
    projectID: string,
    deploymentId: string
) {
    const timestamp = Date.now();
    const deduplicationId = `${deploymentId}-archive-${timestamp}`;

    const command = new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL!,
        MessageBody: JSON.stringify({
            PROJECT_ID: projectID,
            DEPLOYMENT_ID: deploymentId,
            type: "archive",
            status: "ARCHIVED",
            timestamp,
        }),
        MessageGroupId: MESSAGE_GROUPS.DEPLOYMENT_ARCHIVE,
        MessageDeduplicationId: deduplicationId,
    });

    await sqsClient.send(command);
}

export async function startDeployment(project: Project, deploymentId: string) {
    const environment = process.env.NEXT_PUBLIC_CURRENT_DOMAIN!.startsWith(
        "localhost"
    )
        ? "dev"
        : "prod";

    if (environment === "prod") {
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
                            { name: "DEPLOYMENT_ID", value: deploymentId },
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
    } else {
        const docker = new Docker({ socketPath: "/var/run/docker.sock" });
        const container = await docker.createContainer({
            Image: "snap-host-builder-image",
            name: `deployment-${deploymentId}`,
            Env: [
                `GIT_REPOSITORY_URL=${project.gitURL}`,
                `PROJECT_ID=${project.subDomain}`,
                `DEPLOYMENT_ID=${deploymentId}`,
                `AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID}`,
                `AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY}`,
                `AWS_REGION=${process.env.AWS_REGION}`,
                `SQS_QUEUE_URL=${process.env.SQS_QUEUE_URL}`,
            ],
            HostConfig: {
                NetworkMode: "host",
                CapAdd: ["NET_ADMIN"],
            },
        });
        await container.start();
    }
}
