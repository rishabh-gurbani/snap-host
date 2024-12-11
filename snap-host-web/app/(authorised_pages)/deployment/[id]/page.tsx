import DeploymentView from "@/app/(authorised_pages)/deployment/deployment-page";
export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const id = (await params).id;
    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-6">
            <DeploymentView deploymentId={id} />
        </div>
    );
}
