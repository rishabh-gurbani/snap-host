import { exec, execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import * as mime from "mime-types";
import { validatePackageJson, ALLOWED_MIME_TYPES } from './security-utils';

interface MessagePayload {
    log?: string;
    status?: string;
    [key: string]: any;
}

const PROJECT_ID = process.env.PROJECT_ID!;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID!;
const BUILD_DIR = "/home/build/output";
const QUEUE_URL = process.env.SQS_QUEUE_URL!;
const MESSAGE_GROUP_ID = "build-updates";

// Remove ALLOWED_MIME_TYPES constant as it's now imported

let sqsClient: SQSClient;

async function publishMessage(
    type: string,
    payload: MessagePayload
): Promise<void> {
    const timestamp = Date.now();
    const deduplicationId = `${DEPLOYMENT_ID}-${type}-${timestamp}`;
    const MessageBody = JSON.stringify({
        timestamp,
        PROJECT_ID,
        DEPLOYMENT_ID,
        type,
        ...payload,
    });
    console.log(MessageBody);

    console.log(QUEUE_URL);

    const command = new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody,
        MessageAttributes: {
            MessageType: {
                DataType: "String",
                StringValue: type,
            },
        },
        MessageGroupId: MESSAGE_GROUP_ID,
        MessageDeduplicationId: deduplicationId,
    });

    await sqsClient.send(command);
}

async function publishLog(log: string): Promise<void> {
    await publishMessage("log", { log });
}

async function updateDeploymentStatus(status: string): Promise<void> {
    await publishMessage("status", { status });
}

async function init(): Promise<void> {
    console.log("Executing script.js");
    try {
        const s3Client = new S3Client({
            region: process.env.AWS_REGION as string,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
            },
        });

        sqsClient = new SQSClient({
            region: process.env.AWS_REGION as string,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
            },
        });

        await publishLog("Build Started...");
        execSync(`rm -rf ${BUILD_DIR}/*`);
        execSync(`git clone ${process.env.GIT_REPOSITORY_URL} ${BUILD_DIR}`);

        // Add security validation
        try {
            validatePackageJson(BUILD_DIR);
            await publishLog("Security validation passed");
        } catch (error) {
            await publishLog(`Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            await updateDeploymentStatus("FAIL");
            process.exit(1);
        }

        execSync(`chown -R builduser:builduser ${BUILD_DIR}`);

        const BUILD_TIMEOUT = 110000; // 110 seconds in milliseconds
        
        const buildP = exec(
            `cd ${BUILD_DIR} && HOME=/home/build npm install && npm run build`,
            {
                uid: parseInt(execSync("id -u builduser").toString(), 10),
                gid: parseInt(execSync("id -g builduser").toString(), 10),
                env: {
                    PATH: process.env.PATH,
                    HOME: "/home/build",
                    npm_config_cache: "/home/build/.npm",
                    NODE_ENV: process.env.NODE_ENV,
                },
                timeout: BUILD_TIMEOUT,
                killSignal: 'SIGTERM'
            }
        );

        // Add timeout handler
        const timeoutId = setTimeout(async () => {
            buildP.kill('SIGTERM');
            await publishLog("Build timed out after 110 seconds");
            await updateDeploymentStatus("FAIL");
            process.exit(1);
        }, BUILD_TIMEOUT);

        buildP.stdout?.on("data", async (data: Buffer | string) => {
            console.log(data.toString());
            await publishLog(data.toString());
        });

        buildP.stderr?.on("data", async (err: Buffer | string) => {
            console.error(err.toString());
            await publishLog(`error: ${err.toString()}`);
        });

        buildP.on("close", async (code) => {
            clearTimeout(timeoutId);  // Clear timeout if process completes
            console.log("Build completed with code:", code);
            await publishLog(`Build Completed with code: ${code}`);

            if (code !== 0) {
                console.error("Build failed with non-zero exit code");
                await publishLog(`Build failed with non-zero exit code`);
                await updateDeploymentStatus("FAIL");
                process.exit(1);
            }

            const distFolderPath = path.join(BUILD_DIR, "dist");

            // Verify dist folder exists
            if (!fs.existsSync(distFolderPath)) {
                console.error("Build failed - dist folder not found");
                await updateDeploymentStatus("FAIL");
                process.exit(1);
            }

            try {
                const distFolderContents = fs.readdirSync(distFolderPath, {
                    recursive: true,
                });

                for (const filePath of distFolderContents) {
                    const fullPath = path.join(
                        distFolderPath,
                        filePath as string
                    );
                    if (fs.lstatSync(fullPath).isDirectory()) continue;

                    const mimeType = mime.lookup(filePath as string) || 'application/octet-stream';
                    
                    // Skip files with unallowed MIME types
                    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
                        await publishLog(`Skipping ${filePath} - unsupported file type: ${mimeType}`);
                        continue;
                    }

                    console.log(`Uploading ${filePath}`);
                    await publishLog(`Uploading ${filePath}`);

                    const command = new PutObjectCommand({
                        Bucket: "snap-host",
                        Key: `__output__/${PROJECT_ID}/${filePath}`,
                        Body: fs.createReadStream(fullPath),
                        ContentType: mimeType,
                    });

                    await s3Client.send(command);
                    console.log(`Uploaded ${filePath}`);
                    await publishLog(`Uploaded ${filePath}`);
                }

                console.log("Build and upload completed successfully");
                await publishLog("Build and upload completed successfully");
                await updateDeploymentStatus("READY");
                process.exit(0);
            } catch (err) {
                console.error("Upload failed:", err);
                await publishLog(`Upload failed: ${err}`);
                await updateDeploymentStatus("FAIL");
                process.exit(1);
            }
        });
    } catch (err) {
        console.error("Failed to execute build:", err);
        await publishLog(`Failed to execute build: ${err}`);
        await updateDeploymentStatus("FAIL");
        process.exit(1);
    }
}

init().catch(console.error);
