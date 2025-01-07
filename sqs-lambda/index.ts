// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { SQSEvent, Context, SQSHandler, SQSRecord } from "aws-lambda";
import { eq } from "drizzle-orm";
import db from "./db";
import { logs, deployments } from "./db/schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MESSAGE_GROUPS = {
    BUILD_UPDATES: "build-updates",
    DEPLOYMENT_ARCHIVE: "deployment-archive",
};

const s3Client = new S3Client({});
const BUCKET_NAME = "snap-host";

export const handler: SQSHandler = async (
    event: SQSEvent,
    context: Context
): Promise<void> => {
    try {
        for (const message of event.Records) {
            const messageGroupId = message.attributes.MessageGroupId;

            switch (messageGroupId) {
                case MESSAGE_GROUPS.BUILD_UPDATES:
                    await processBuildMessage(message);
                    break;
                case MESSAGE_GROUPS.DEPLOYMENT_ARCHIVE:
                    await processArchiveMessage(message);
                    break;
                default:
                    console.warn(`Unknown message group: ${messageGroupId}`);
            }
        }
        console.info("done");
    } catch (err) {
        console.error("Lambda handler error:", err);
        throw err;
    }
};

async function processBuildMessage(message: SQSRecord): Promise<void> {
    const messageBody = JSON.parse(message.body);
    const { DEPLOYMENT_ID, type, log, status } = messageBody;

    if (!DEPLOYMENT_ID) {
        throw new Error("Missing DEPLOYMENT_ID in message body");
    }

    if (type === "status") {
        await db
            .update(deployments)
            .set({ status })
            .where(eq(deployments.id, DEPLOYMENT_ID));

        await db.insert(logs).values({
            deploymentId: DEPLOYMENT_ID,
            message: `Status updated to: ${status}`,
            type: "STATUS",
        });
    } else {
        await db.insert(logs).values({
            deploymentId: DEPLOYMENT_ID,
            message: log || JSON.stringify(messageBody),
            type: type || "INFO",
        });
    }
}

async function processArchiveMessage(message: SQSRecord): Promise<void> {
    const messageBody = JSON.parse(message.body);
    const { DEPLOYMENT_ID, PROJECT_ID } = messageBody;

    if (!DEPLOYMENT_ID || !PROJECT_ID) {
        throw new Error(
            "Missing DEPLOYMENT_ID or PROJECT_ID in archive message"
        );
    }

    const deploymentLogs = await db.query.logs.findMany({
        where: (logs, { eq }) => eq(logs.deploymentId, DEPLOYMENT_ID),
        orderBy: (logs, { asc }) => asc(logs.createdAt),
    });

    if (deploymentLogs.length > 0) {
        const formattedLogs = deploymentLogs.map((log) => ({
            eventId: log.id,
            timestamp: log.createdAt,
            type: log.type,
            message: log.message,
        }));

        const s3Key = `__logs__/${PROJECT_ID}/${DEPLOYMENT_ID}/build-logs.json`;
        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: JSON.stringify(formattedLogs, null, 2),
                ContentType: "application/json",
            })
        );

        await db.delete(logs).where(eq(logs.deploymentId, DEPLOYMENT_ID));
    }

    await db
        .update(deployments)
        .set({
            logsArchived: true,
        })
        .where(eq(deployments.id, DEPLOYMENT_ID));

    console.log(
        `Archived deployment ${DEPLOYMENT_ID} logs to S3 path: __logs__/${PROJECT_ID}/${DEPLOYMENT_ID}/build-logs.json`
    );
}
