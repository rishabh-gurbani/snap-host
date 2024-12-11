const { exec, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const { Kafka } = require("kafkajs");

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const BUILD_DIR = "/home/build/output";

const kafka = new Kafka({
    clientId: `docker-build-server-${PROJECT_ID}-${DEPLOYMENT_ID}`,
    brokers: [process.env.KAFKA_BROKER],
    ssl: {
        ca: [fs.readFileSync(path.join(__dirname, "ca.pem"), "utf-8")],
    },
    sasl: {
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
        mechanism: "plain",
    },
});

const producer = kafka.producer();

async function publishMessage(type, payload) {
    await producer.send({
        topic: "container-logs",
        messages: [
            {
                key: type,
                value: JSON.stringify({
                    PROJECT_ID,
                    DEPLOYMENT_ID,
                    type,
                    ...payload,
                }),
            },
        ],
    });
}

async function publishLog(log) {
    await publishMessage("log", { log });
}

async function updateDeploymentStatus(status) {
    await publishMessage("status", { status });
}

async function init() {
    await producer.connect();

    console.log("Executing script.js");
    await publishLog("Build Started...");
    try {
        execSync(`rm -rf ${BUILD_DIR}/*`);
        execSync(`git clone ${process.env.GIT_REPOSITORY_URL} ${BUILD_DIR}`);

        execSync(`chown -R builduser:builduser ${BUILD_DIR}`);

        const buildP = exec(
            `cd ${BUILD_DIR} && HOME=/home/build npm install && npm run build`,
            {
                uid: parseInt(execSync("id -u builduser")),
                gid: parseInt(execSync("id -g builduser")),
                env: {
                    PATH: process.env.PATH,
                    HOME: "/home/build",
                    npm_config_cache: "/home/build/.npm",
                    NODE_ENV: process.env.NODE_ENV,
                },
            }
        );

        buildP.stdout.on("data", async (data) => {
            console.log(data.toString());
            await publishLog(data.toString());
        });

        buildP.stderr.on("data", async (err) => {
            console.error(err.toString());
            await publishLog(`error: ${err.toString()}`);
        });

        buildP.on("close", async (code) => {
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
                    const fullPath = path.join(distFolderPath, filePath);
                    if (fs.lstatSync(fullPath).isDirectory()) continue;

                    console.log(`Uploading ${filePath}`);
                    await publishLog(`Uploading ${filePath}`);

                    const command = new PutObjectCommand({
                        Bucket: "snap-host",
                        Key: `__output__/${PROJECT_ID}/${filePath}`,
                        Body: fs.createReadStream(fullPath),
                        ContentType: mime.lookup(filePath),
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

init();
