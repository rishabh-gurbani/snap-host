"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { deleteProject } from "@/app/actions/project";
import { useRouter } from "next/navigation";

export function DeleteProjectButton({
    projectId,
    projectName,
}: {
    projectId: string;
    projectName: string;
}) {
    const router = useRouter();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleteDisabled, setDeleteDisabled] = useState(false);

    const handleDelete = async () => {
        if (deleteConfirmation === projectName) {
            setDeleteDisabled(true);
            await deleteProject(projectId);
            await setIsDeleteDialogOpen(false);
            setDeleteConfirmation("");
            router.replace("/dashboard");
        }
    };

    return (
        <>
            <Button
                variant="outline"
                className="bg-black hover:bg-zinc-900 hover:text-red-500 text-red-500 border border-red-500/20 hover:border-red-500"
                onClick={() => setIsDeleteDialogOpen(true)}
            >
                <Trash2 className="w-4 h-4" />
                Delete Project
            </Button>
            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent className="bg-black border border-zinc-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            This action cannot be undone. This will permanently
                            delete the project and all associated deployments.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="mt-4">
                        <Input
                            type="text"
                            placeholder={`Type "${projectName}" to confirm`}
                            value={deleteConfirmation}
                            onChange={(e) =>
                                setDeleteConfirmation(e.target.value)
                            }
                            className="bg-black text-white border-zinc-800 focus:ring-0 focus:border-zinc-700"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={
                                deleteConfirmation !== projectName ||
                                deleteDisabled
                            }
                            className="bg-red-500 text-white hover:bg-red-600 focus:ring-0"
                        >
                            Delete Project
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
