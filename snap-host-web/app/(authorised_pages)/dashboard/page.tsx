import { Suspense } from "react";
import ProjectsList from "./projects-list";
import CreateProjectButton from "./create-project-button";

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-black px-4 py-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl font-bold text-white">
                        Your Projects
                    </h1>
                    <CreateProjectButton />
                </div>
                <Suspense fallback={<ProjectsLoading />}>
                    <ProjectsList />
                </Suspense>
            </div>
        </div>
    );
}

function ProjectsLoading() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                    <div className="h-[200px] bg-[#111] rounded-lg border border-[#222]"></div>
                </div>
            ))}
        </div>
    );
}
