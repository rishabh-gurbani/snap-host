"use client";

import { Card } from "@/components/ui/card";
import { GitHubLogoIcon, GlobeIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { type Project } from "@/db/schema";
import { formatDistanceToNow } from "date-fns";

function formatRelativeDate(date: Date | string) {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
}

export default function InteractiveProjectCard({
    project,
}: {
    project: Project;
}) {
    const router = useRouter();

    const handleCardClick = () => {
        router.push(`/project/${project.id}`);
    };

    const handleGitHubClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (project.gitURL) {
            window.open(project.gitURL, "_blank");
        }
    };

    const handleWebsiteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (project.subDomain) {
            const host = process.env.NEXT_PUBLIC_CURRENT_DOMAIN;
            const url = `http://${project.subDomain}.${host}`;
            window.open(url, "_blank");
        }
    };

    return (
        <Card
            onClick={handleCardClick}
            className="bg-[#111] border-[#222] p-6 transition-all duration-200 hover:border-[#333] cursor-pointer relative"
        >
            {/* Website Icon */}
            {project.subDomain && (
                <button
                    type="button"
                    onClick={handleWebsiteClick}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    title="Visit Website"
                >
                    <GlobeIcon className="w-5 h-5" />
                </button>
            )}

            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                    <div className="text-lg font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        sh
                    </div>
                </div>
                <div className="flex-grow min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">
                        {project.name}
                    </h3>
                    <p className="text-sm text-gray-400 truncate mb-4">
                        {project.subDomain}
                    </p>
                    <div className="flex items-center text-sm">
                        {project.gitURL && (
                            <button
                                type="button"
                                onClick={handleGitHubClick}
                                className="flex items-center gap-x-2 text-gray-400 hover:text-white transition-colors font-medium"
                            >
                                <GitHubLogoIcon className="w-4 h-4" />
                                <span className="truncate">
                                    {project.gitURL.replace(
                                        "https://github.com/",
                                        ""
                                    )}
                                </span>
                            </button>
                        )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        {formatRelativeDate(project.updatedAt!)} 
                        {/* on{" "}
                        <span className="text-gray-400 font-medium">main</span> */}
                    </div>
                </div>
            </div>
        </Card>
    );
}
