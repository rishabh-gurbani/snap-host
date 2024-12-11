import { getUser } from "@/app/actions/user";
import { DeploymentFlow } from "./deployment-flow";
// import Loading from "./loading-component";
import { getRepositories } from "@/app/actions/repo";

export default async function NewProjectPage() {
    // Fetch initial data on the server
    const { data: repos } = await getRepositories(200);
    const { data: user } = await getUser();

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">
                            Let's build something new.
                        </h1>
                        <p className="text-gray-400">
                            To deploy a new Project, import an existing Git
                            Repository.
                        </p>
                    </div>
                    {/* <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    Collaborate on a Pro Trial
                </Button> */}
                </div>
                <DeploymentFlow
                    initialRepositories={repos}
                    username={user!.login}
                />
            </div>
        </div>
    );
}
