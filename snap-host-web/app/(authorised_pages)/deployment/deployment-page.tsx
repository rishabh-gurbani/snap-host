"use client";
import { useEffect, useState, useRef } from "react";
import {
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Search,
    RefreshCw,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getBuildStatus } from "@/app/actions/build-status";
import { getDeploymentLogs } from "@/app/actions/logs";
import Link from "next/link";

interface Log {
    event_id: string;
    deployment_id: string;
    log: string;
    timestamp: string;
}

interface DeploymentViewProps {
    deploymentId: string;
}

export default function DeploymentView({ deploymentId }: DeploymentViewProps) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [status, setStatus] = useState<
        "QUEUED" | "BUILDING" | "READY" | "FAILED"
    >("QUEUED");
    const [projectURL, setProjectUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    // const [startTime] = useState(new Date());
    const [expandedSections, setExpandedSections] = useState({
        buildLogs: true,
        summary: false,
        domains: false,
    });
    const [creationTime, setCreationTime] = useState<Date | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [logsResponse, statusResponse] = await Promise.all([
                getDeploymentLogs(deploymentId),
                getBuildStatus(deploymentId),
            ]);

            if (logsResponse.success && statusResponse.success) {
                setLogs(logsResponse.data as Log[]);
                setStatus(
                    statusResponse.data.status as
                        | "QUEUED"
                        | "BUILDING"
                        | "READY"
                        | "FAILED"
                );
                setCreationTime(new Date(statusResponse.data.createdAt!));
                if (statusResponse.data.status == "READY") {
                    setProjectUrl(
                        // @ts-expect-error drizzle
                        `http://${statusResponse.data.project.subDomain}.${process.env.NEXT_PUBLIC_CURRENT_DOMAIN}`
                    );
                }
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval =
            status === "QUEUED" || status === "BUILDING"
                ? setInterval(fetchData, 5000)
                : null;
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [deploymentId, status]);

    useEffect(() => {
        const filtered = searchQuery
            ? logs.filter((log) =>
                  log.log.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : logs;
        setFilteredLogs(filtered);
    }, [logs, searchQuery]);

    // useEffect(() => {
    //     if (logsEndRef.current) {
    //         logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    //     }
    // }, [filteredLogs]);

    const getElapsedTime = () => {
        if (!creationTime) return "0s";
        const elapsed = new Date().getTime() - creationTime.getTime();
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    return (
        <div className="max-w-[1200px] mx-auto">
            <div className="rounded-lg border border-neutral-800 bg-black overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-neutral-800">
                    <div className="space-y-1">
                        <h1 className="text-lg font-semibold text-white">
                            Deployment
                        </h1>
                        <div className="flex items-center text-sm text-neutral-400">
                            <div className="flex items-center gap-2">
                                {status === "QUEUED" ||
                                status === "BUILDING" ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                ) : status === "READY" ? (
                                    <div className="h-3 w-3 rounded-full bg-green-500" />
                                ) : (
                                    <div className="h-3 w-3 rounded-full bg-red-500" />
                                )}
                                Deployment started {getElapsedTime()} ago...
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchData}
                            disabled={isLoading}
                            className="border-neutral-800 bg-black text-neutral-400 hover:bg-neutral-900 hover:text-white"
                        >
                            <RefreshCw
                                className={cn(
                                    "h-4 w-4 mr-2",
                                    isLoading && "animate-spin"
                                )}
                            />
                            Refresh
                        </Button>
                        {(status === "QUEUED" || status === "BUILDING") && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-neutral-800 bg-black text-red-400 hover:bg-neutral-900 hover:text-red-300"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>

                {status === "READY" && (
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/30">
                        <span className="text-green-400">
                            Your project is live!
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-neutral-800 bg-black text-neutral-400 hover:bg-neutral-900 hover:text-white"
                        >
                            <Link
                                href={projectURL}
                                target="_blank"
                                className="w-full flex"
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Site
                            </Link>
                        </Button>
                    </div>
                )}

                <div className="space-y-1">
                    <button
                        onClick={() => toggleSection("buildLogs")}
                        className="w-full px-4 py-2 flex items-center text-sm text-neutral-400 hover:bg-neutral-900/30"
                    >
                        {expandedSections.buildLogs ? (
                            <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                            <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        Build Logs
                        {isLoading && (
                            <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-neutral-400" />
                        )}
                    </button>

                    {expandedSections.buildLogs && (
                        <div className="px-4 pb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                                <Input
                                    placeholder="Find in logs"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-9 bg-neutral-900/30 border-neutral-800 text-neutral-400 placeholder:text-neutral-500"
                                />
                            </div>
                            <div className="mt-4 bg-black rounded-lg border border-neutral-800">
                                <div className="p-4 h-[600px] overflow-auto font-mono text-sm">
                                    {filteredLogs.map((log) => (
                                        <div
                                            key={log.event_id}
                                            className="pb-1"
                                        >
                                            <span className="text-neutral-500">
                                                {new Date(
                                                    log.timestamp
                                                ).toLocaleTimeString()}
                                                :{" "}
                                            </span>
                                            <span className="text-neutral-300">
                                                {log.log}
                                            </span>
                                        </div>
                                    ))}
                                    {filteredLogs.length === 0 && (
                                        <div className="text-neutral-500 italic">
                                            {searchQuery
                                                ? "No matching logs found"
                                                : "Waiting for deployment logs..."}
                                        </div>
                                    )}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* <button
                        onClick={() => toggleSection("summary")}
                        className="w-full px-4 py-2 flex items-center text-sm text-neutral-400 hover:bg-neutral-900/30"
                    >
                        {expandedSections.summary ? (
                            <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                            <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        Deployment Summary
                    </button>

                    <button
                        onClick={() => toggleSection("domains")}
                        className="w-full px-4 py-2 flex items-center text-sm text-neutral-400 hover:bg-neutral-900/30"
                    >
                        {expandedSections.domains ? (
                            <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                            <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        Assigning Custom Domains
                    </button> */}
                </div>
            </div>
        </div>
    );
}
