// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { SQSEvent, Context, SQSHandler, SQSRecord } from "aws-lambda";
import { eq } from "drizzle-orm";
import db from "./db";
import { logs, deployments } from "./db/schema";

export const handler: SQSHandler = async (
    event: SQSEvent,
    context: Context
): Promise<void> => {
    try {
        for (const message of event.Records) {
            await processMessageAsync(message);
        }
        console.info("done");
    } catch (err) {
        console.error("Lambda handler error:", err);
        throw err;
    }
};

async function processMessageAsync(message: SQSRecord): Promise<void> {
    try {
        const messageBody = JSON.parse(message.body);
        console.log(messageBody);
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

        console.log(`Processed and stored log for deployment ${DEPLOYMENT_ID}`);
    } catch (err) {
        console.error("Error processing message:", err);
        throw err;
    }
}
