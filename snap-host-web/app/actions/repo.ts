"use server";

import { getServerSession } from "@/lib/auth-utils";
import { auth } from "@/auth";
import db from "@/db";
import { Octokit } from "octokit";
import { headers } from "next/headers";

export async function getRepositories(limit: number = 5) {
    try {
        const session = await getServerSession();
        if (!session) throw new Error("Unauthorized");

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

        const repos = await octokit.request(
            `GET /user/repos?visibility=all&sort=updated&per_page=${limit}&sort=updated`,
            {
                headers: {
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            }
        );

        return {
            success: true as const,
            data: repos.data,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch repositories",
        };
    }
}
