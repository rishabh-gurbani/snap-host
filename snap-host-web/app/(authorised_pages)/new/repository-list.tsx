"use client";

import { Button } from "@/components/ui/button";
import { Github, Lock } from "lucide-react";
import type { Repository } from "@/types/deployment";

interface RepositoryListProps {
    repositories: Repository[];
    onImport: (repo: Repository) => void;
}

export function RepositoryList({
    repositories,
    onImport,
}: RepositoryListProps) {
    return (
        <div className="space-y-2">
            {repositories.map((repo) => (
                <div
                    key={repo.id}
                    className="flex items-center justify-between p-4 bg-black border border-gray-800 rounded-lg"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black border border-gray-800 rounded-full flex items-center justify-center">
                            {repo.private ? (
                                <Lock className="w-4 h-4" />
                            ) : (
                                <Github className="w-4 h-4" />
                            )}
                        </div>
                        <div>
                            <div className="font-medium">{repo.name}</div>
                            <div className="text-sm text-gray-400">
                                {repo.updatedAt}
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="bg-white text-black border-gray-800 hover:bg-gray-300 hover:border-gray-700"
                        onClick={() => onImport(repo)}
                    >
                        Import
                    </Button>
                </div>
            ))}
        </div>
    );
}
