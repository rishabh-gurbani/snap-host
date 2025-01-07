"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { createDeployment } from "@/app/actions/deploy";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RedeployButton({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [isDeploying, setIsDeploying] = useState(false);

    const handleRedeploy = async () => {
        setIsDeploying(true);
        try {
            await createDeployment(projectId);
            router.refresh();
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <Button
            onClick={handleRedeploy}
            disabled={isDeploying}
            className="bg-zinc-900 text-white border-0 hover:bg-zinc-800"
        >
            {isDeploying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Redeploy
        </Button>
    );
}
