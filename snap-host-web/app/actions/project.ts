"use server";

import { getServerSession } from "@/lib/auth-utils";
import db from "@/db";
import { deployments, projects } from "@/db/schema";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { Octokit } from "octokit";
import { eq } from "drizzle-orm";
import {
    DeleteObjectsCommand,
    ListObjectsV2Command,
    S3Client,
} from "@aws-sdk/client-s3";

const projectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    gitURL: z.string().url("Invalid Git repository URL"),
});

export async function getProject(projectId: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const project = await db.query.projects.findFirst({
            where: (projects, { eq, and }) =>
                and(
                    eq(projects.id, projectId),
                    eq(projects.userId, session.user.id)
                ),
        });

        return {
            success: true as const,
            data: project,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch project",
        };
    }
}

export async function getProjectWithDeployments(projectId: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const project = await db.query.projects.findFirst({
            where: (projects, { eq, and }) =>
                and(
                    eq(projects.id, projectId),
                    eq(projects.userId, session.user.id)
                ),
            with: {
                deployments: {
                    orderBy: (deployments, { desc }) =>
                        desc(deployments.createdAt),
                },
            },
        });

        return {
            success: true as const,
            data: project,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch project",
        };
    }
}

export async function getProjects() {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const userProjects = await db.query.projects.findMany({
            where: (project, { eq }) => eq(project.userId, session.user.id),
            orderBy: (project, { desc }) => [desc(project.updatedAt)],
        });

        return {
            success: true as const,
            data: userProjects,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch projects",
        };
    }
}

export async function createProject(input: z.infer<typeof projectSchema>) {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const validation = projectSchema.safeParse(input);
        if (!validation.success) {
            throw new Error(validation.error.errors[0].message);
        }

        const ghAccount = await auth.api.listUserAccounts({
            headers: await headers(),
        });
        if (!ghAccount?.length) throw new Error("No GitHub account found");

        const accessToken = await db.query.account.findFirst({
            where: (account, { eq }) => eq(account.id, ghAccount[0].id),
        });

        const octokit = new Octokit({
            auth: accessToken?.accessToken,
        });

        const { data: user } = await octokit.request("GET /user", {
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        const { name, gitURL } = validation.data;

        const match = gitURL.match(/github\.com\/[^/]+\/([^/.]+)(?:\.git)?$/);
        const repoName = match![1];

        const repo = await octokit.request("GET /repos/{owner}/{repo}", {
            owner: user.login,
            repo: repoName,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        if (!repo) {
            throw new Error("No github project found");
        }

        const { size: sizeInKb } = repo.data;
        const sizeInMb = sizeInKb / 1024;
        if (sizeInMb > 20) {
            throw new Error("Repository size is too big");
        }

        const subDomain = name + "-" + generateSlug(2) + "-" + user.login;
        const project = await db
            .insert(projects)
            .values({
                name,
                gitURL,
                subDomain,
                userId: session.user.id,
            })
            .returning();

        // console.log(repoName);
        const response = await octokit.request(
            "POST /repos/{owner}/{repo}/hooks",
            {
                owner: user.login,
                repo: repoName,
                name: "web",
                active: true,
                events: ["push"],
                config: {
                    url: `https://${process.env.PROD_DOMAIN}/api/github-project?projectId=${project[0].id}`,
                    content_type: "json",
                    insecure_ssl: "0",
                    secret: process.env.GITHUB_WEBHOOK_SECRET,
                },
                headers: {
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            }
        );
        const webhookId = response.data.id;

        await db
            .update(projects)
            .set({
                githubWebhookId: webhookId,
            })
            .where(eq(projects.id, project[0].id));
        // console.log(response);
        // console.log("Created Webhook");
        return {
            success: true as const,
            data: project[0],
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to create project",
        };
    }
}

async function deleteProjectFiles(projectSlug: String) {
    try {
        const s3Client = new S3Client({
            region: process.env.AWS_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
        // List all objects with the project prefix
        const listCommand = new ListObjectsV2Command({
            Bucket: "snap-host",
            Prefix: `__output__/${projectSlug}/`,
        });

        const listedObjects = await s3Client.send(listCommand);
        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            console.log(`No files found for project ${projectSlug}`);
            return;
        }

        // Prepare the delete command with the list of objects
        const deleteCommand = new DeleteObjectsCommand({
            Bucket: "snap-host",
            Delete: {
                Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
            },
        });

        // Delete the objects
        await s3Client.send(deleteCommand);
        console.log(
            `Successfully deleted all files for project ${projectSlug}`
        );
    } catch (err) {
        console.error(`Error deleting project files: ${err}`);
        throw err;
    }
}

export async function deleteProject(projectId: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) throw new Error("Unauthorized");

        const userProject = await db.query.projects.findFirst({
            where: (project, { and, eq }) =>
                and(
                    eq(project.id, projectId),
                    eq(project.userId, session.user.id)
                ),
        });

        if (!userProject) {
            return {
                success: false as const,
                data: "No project found",
            };
        }

        // await db.transaction(async (tx) => {
        await db
            .delete(deployments)
            .where(eq(deployments.projectId, userProject.id));
        await db.delete(projects).where(eq(projects.id, userProject.id));
        // });

        const ghAccount = await auth.api.listUserAccounts({
            headers: await headers(),
        });
        if (!ghAccount?.length) throw new Error("No GitHub account found");

        const accessToken = await db.query.account.findFirst({
            where: (account, { eq }) => eq(account.id, ghAccount[0].id),
        });

        const octokit = new Octokit({
            auth: accessToken?.accessToken,
        });

        const { data: user } = await octokit.request("GET /user", {
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        const match = userProject.gitURL!.match(
            /github\.com\/[^/]+\/([^/.]+)(?:\.git)?$/
        );
        const repoName = match![1];

        await octokit.request("DELETE /repos/{owner}/{repo}/hooks/{hook_id}", {
            owner: user.login,
            repo: repoName,
            hook_id: userProject.githubWebhookId!,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        await deleteProjectFiles(userProject.subDomain!);

        console.log("Deleted project");

        return {
            success: true as const,
            data: "Deleted project",
        };
    } catch (error) {
        console.log(error);
        console.log("Failed to delete project");
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to delete project",
        };
    }
}
