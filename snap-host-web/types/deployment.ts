export type DeploymentStage = "SELECTING_REPO" | "CONFIGURING_DEPLOYMENT";

export interface Repository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    updatedAt: string;
    branch: string;
    git_url: string;
    clone_url: string;
}
