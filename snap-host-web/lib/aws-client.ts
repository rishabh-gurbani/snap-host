import { ECSClient } from "@aws-sdk/client-ecs";

export const CONFIG = {
    CLUSTER: process.env.ECS_CLUSTER!,
    TASK: process.env.ECS_TASK!,
};

export const ecsClient = new ECSClient({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: process.env.AWS_REGION,
});
