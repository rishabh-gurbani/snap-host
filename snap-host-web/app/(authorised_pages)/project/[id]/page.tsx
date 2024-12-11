// import { getProject, getDeployments } from "@/lib/actions"
import { getProjectWithDeployments } from "@/app/actions/project";
import { getDeployments } from "@/app/actions/deploy";
import { mockProject, mockDeployments } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { GitBranch, ExternalLink, Clock, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { DeleteProjectButton } from "./DeleteProjectButton";
import { DeploymentStatus, Status } from "@/components/deployment-status";

export default async function ProjectPage({
    searchParams,
    params,
}: {
    searchParams: { tab?: string };
    params: Promise<{ id: string }>;
}) {
    const id = (await params).id;
    const project = (await getProjectWithDeployments(id)).data!;
    const deployments = project.deployments!;
    const activeTab = searchParams.tab || "project";

    return (
        <div className="flex min-h-screen mx-auto max-w-7xl flex-col bg-black text-white">
            <div className="container px-4 py-8">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {project.name}
                        </h1>
                        <div className="flex items-center gap-3">
                            <DeleteProjectButton
                                projectName={project.name!}
                                projectId={id!}
                            />
                            <Button className="bg-zinc-900 text-white border-0 hover:bg-zinc-800">
                                <ExternalLink className="w-4 h-4" />
                                <a
                                    href={`http://${project.subDomain}.${process.env.NEXT_PUBLIC_CURRENT_DOMAIN}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Visit
                                </a>
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <GitBranch className="w-4 h-4" />
                            <span>{project.gitURL}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                            <ExternalLink className="w-4 h-4" />
                            <a
                                href={`http://${project.subDomain}.${process.env.NEXT_PUBLIC_CURRENT_DOMAIN}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-white transition-colors"
                            >
                                {project.subDomain}
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-8 border-b border-zinc-800">
                    <div className="flex gap-8">
                        <Link
                            href="?tab=project"
                            replace={true}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === "project"
                                    ? "text-white border-b-2 border-white"
                                    : "text-zinc-400 hover:text-white"
                            }`}
                        >
                            Project
                        </Link>
                        <Link
                            href="?tab=deployments"
                            replace={true}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === "deployments"
                                    ? "text-white border-b-2 border-white"
                                    : "text-zinc-400 hover:text-white"
                            }`}
                        >
                            Deployments
                        </Link>
                    </div>
                </div>

                {activeTab === "project" && (
                    <div className="mt-6 space-y-4">
                        <div className="p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
                            <h2 className="text-xl font-semibold mb-4">
                                Production Deployment
                            </h2>
                            <p className="text-sm text-zinc-400 mb-6">
                                The deployment that is available to your
                                visitors.
                            </p>
                            <div className="space-y-4">
                                <div className="rounded-lg border border-zinc-800 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                                Deployment
                                            </p>
                                            <p className="text-sm text-zinc-400">
                                                {project.name}-
                                                {deployments[0].id}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <div>
                                            <p className="text-sm font-medium">
                                                Domains
                                            </p>
                                            <p className="text-sm text-zinc-400">
                                                {project.subDomain}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                Status
                                            </p>
                                            <DeploymentStatus status="READY" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "deployments" && (
                    <div className="mt-6 space-y-4">
                        {deployments.map((deployment) => (
                            <Link
                                key={deployment.id}
                                href={`/deployment/${deployment.id}`}
                                className="block p-6 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <DeploymentStatus
                                            status={deployment.status as Status}
                                        />
                                        {/* <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <GitBranch className="w-4 h-4" />
                                            <span>main</span>
                                            <span className="text-zinc-600">
                                                •
                                            </span>
                                            <span>webhook fix</span>
                                        </div> */}
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <Clock className="w-4 h-4" />
                                            <time
                                                dateTime={deployment.createdAt!.toISOString()}
                                            >
                                                {formatDistanceToNow(
                                                    deployment.createdAt!
                                                )}{" "}
                                                ago
                                            </time>
                                        </div>
                                        {/* <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">
                                                        Open menu
                                                    </span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                className="bg-black border-zinc-800"
                                            >
                                                <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer">
                                                    View Deployment
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer">
                                                    Copy URL
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500 hover:text-red-400 hover:bg-zinc-900 cursor-pointer">
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu> */}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
