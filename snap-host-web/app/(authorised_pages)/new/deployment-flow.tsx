"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Github, ChevronDown, Plus, Minus, Copy } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RepositoryList } from "./repository-list";
import type { DeploymentStage, Repository } from "@/types/deployment";
import { createProject } from "@/app/actions/project";
import { useToast } from "@/hooks/use-toast";
import { createDeployment } from "@/app/actions/deploy";

interface DeploymentFlowProps {
    initialRepositories: Repository[];
    username: string;
}

export function DeploymentFlow({
    initialRepositories,
    username,
}: DeploymentFlowProps) {
    const [stage, setStage] = useState<DeploymentStage>("SELECTING_REPO");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedOrg, setSelectedOrg] = useState(username);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
    const [envVars, setEnvVars] = useState([
        { key: "EXAMPLE_NAME", value: "t9JU23NF394R6HH" },
    ]);

    const [deployLoading, setDeployLoading] = useState<boolean>(false);

    const handleImport = (repo: Repository) => {
        // console.log(repo);
        setSelectedRepo(repo);
        setStage("CONFIGURING_DEPLOYMENT");
    };

    const addEnvVar = () => {
        setEnvVars([...envVars, { key: "", value: "" }]);
    };

    const removeEnvVar = (index: number) => {
        setEnvVars(envVars.filter((_, i) => i !== index));
    };

    const { toast } = useToast();
    const router = useRouter();

    const handleDeploy = async () => {
        // Mock deployment action
        // console.log("Deploying...", selectedRepo);
        setDeployLoading(true);
        const { full_name, clone_url } = selectedRepo!;
        console.log(full_name.split("/")[1], clone_url);

        const project = await createProject({
            name: full_name.split("/")[1],
            gitURL: clone_url,
        });

        if (!project.success) {
            toast({
                title: "Error",
                description: project.error,
            });
        } else {
            const response = await createDeployment(project.data.id);

            if (!response.success) {
                toast({
                    title: "Error",
                    description: project.error,
                });
            } else {
                router.push(`/deployment/${response.data.deploymentId}`);
            }
        }
        setDeployLoading(true);

        // Here you would typically trigger your deployment process
    };

    const filteredRepos = initialRepositories
        .filter((repo) =>
            repo.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5);

    return (
        <AnimatePresence mode="wait">
            {stage === "SELECTING_REPO" && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                >
                    <h2 className="text-xl font-semibold">
                        Import Git Repository
                    </h2>
                    <div className="flex gap-2">
                        <Select
                            value={selectedOrg}
                            onValueChange={setSelectedOrg}
                        >
                            <SelectTrigger className="w-[200px] bg-black border-gray-700">
                                <SelectValue>
                                    <div className="flex items-center gap-2">
                                        <Github className="w-4 h-4" />
                                        {selectedOrg}
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rishabh-gurbani">
                                    rishabh-gurbani
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex-1">
                            <Input
                                type="search"
                                placeholder="Search..."
                                className="bg-black border-gray-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <RepositoryList
                        repositories={filteredRepos}
                        onImport={handleImport}
                    />
                    {/* <Button variant="link" className="text-gray-400">
                            Import Third-Party Git Repository →
                        </Button> */}
                </motion.div>
            )}

            {stage === "CONFIGURING_DEPLOYMENT" && selectedRepo && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">
                            Configure Deployment
                        </h2>
                        <Button
                            variant="outline"
                            className="bg-transparent border-gray-700"
                            onClick={() => setStage("SELECTING_REPO")}
                        >
                            Back to Repositories
                        </Button>
                    </div>

                    <div className="bg-black p-4 rounded-lg flex items-center gap-2 border border-gray-800">
                        <Github className="w-5 h-5" />
                        <span>Importing from GitHub</span>
                        <span className="text-gray-400">
                            {selectedRepo.full_name}
                        </span>
                        <span className="text-gray-400 ml-2">main</span>
                    </div>

                    <div className="space-y-4">
                        {/* <div>
                                <label className="text-sm text-gray-400">
                                    Vercel Team
                                </label>
                                <Select defaultValue="personal">
                                    <SelectTrigger className="w-full bg-black border-gray-700 mt-1">
                                        <SelectValue>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-blue-500" />
                                                Personal Account
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="personal">
                                            Personal Account
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div> */}

                        <div>
                            <label className="text-sm text-gray-400">
                                Project Name
                            </label>
                            <Input
                                className="bg-black border-gray-700 mt-1"
                                defaultValue={
                                    selectedRepo.full_name.split("/")[1]
                                }
                            />
                        </div>

                        {/* <div>
                            <label className="text-sm text-gray-400">
                                Framework Preset
                            </label>
                            <Select defaultValue="next">
                                <SelectTrigger className="w-full bg-black border-gray-700 mt-1">
                                    <SelectValue>Next.js</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="next">
                                        Next.js
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div> */}

                        <div>
                            <label className="text-sm text-gray-400">
                                Root Directory
                            </label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    className="flex-1 bg-black border-gray-700"
                                    defaultValue="./"
                                />
                                <Button
                                    variant="outline"
                                    className="bg-transparent border-gray-700"
                                >
                                    Edit
                                </Button>
                            </div>
                        </div>

                        <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-2 text-sm">
                                <ChevronDown className="w-4 h-4" />
                                Build and Output Settings
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 mt-4">
                                <div>
                                    <label className="text-sm text-gray-400">
                                        Build Command
                                    </label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            className="flex-1 bg-black border-gray-700 font-mono"
                                            defaultValue="npm run build"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="bg-transparent border-gray-700"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">
                                        Output Directory
                                    </label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            className="flex-1 bg-black border-gray-700 font-mono"
                                            defaultValue=".next"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="bg-transparent border-gray-700"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">
                                        Install Command
                                    </label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            className="flex-1 bg-black border-gray-700 font-mono"
                                            defaultValue="npm install"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="bg-transparent border-gray-700"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-2 text-sm">
                                <ChevronDown className="w-4 h-4" />
                                Environment Variables
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 mt-4">
                                <div className="space-y-4">
                                    {envVars.map((envVar, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                className="flex-1 bg-black border-gray-700"
                                                placeholder="Key"
                                                defaultValue={envVar.key}
                                            />
                                            <Input
                                                className="flex-1 bg-black border-gray-700"
                                                placeholder="Value"
                                                defaultValue={envVar.value}
                                            />
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="bg-transparent border-gray-700"
                                                onClick={() =>
                                                    removeEnvVar(index)
                                                }
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full bg-transparent border-gray-700"
                                    onClick={addEnvVar}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add More
                                </Button>
                                {/* <p className="text-sm text-gray-400">
                                    Tip: Paste an .env above to populate the
                                    form.{" "}
                                    <a
                                        href="#"
                                        className="text-blue-400 hover:underline"
                                    >
                                        Learn more
                                    </a>
                                </p> */}
                            </CollapsibleContent>
                        </Collapsible>

                        <Button
                            className="w-full bg-white text-black hover:bg-gray-200"
                            disabled={deployLoading}
                            onClick={handleDeploy}
                        >
                            Deploy
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
