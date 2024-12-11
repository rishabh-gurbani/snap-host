import InteractiveProjectCard from "./interactive-project-card";
import { getProjects } from "@/app/actions/project";

export default async function ProjectsList() {
    const { data: projects } = await getProjects();

    if (projects!.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">
                    No projects found. Create a new project to get started!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects!.map((project) => (
                <InteractiveProjectCard key={project.id} project={project} />
            ))}
        </div>
    );
}
