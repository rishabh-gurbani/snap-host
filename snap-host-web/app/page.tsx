import { Button } from "@/components/ui/button";
import SignIn from "@/components/sign-in";
import { ArrowRight, Zap, GitBranch, BarChart3 } from "lucide-react";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function LandingPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (session) redirect("/dashboard");

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-6xl bg-[#111] rounded-xl shadow-2xl overflow-hidden border border-[#222]">
                <div className="flex flex-col md:flex-row">
                    {/* Left side */}
                    <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-between">
                        <div>
                            <div className="mb-8">
                                <h1 className="mt-16 text-4xl md:text-5xl font-bold text-white mb-4">
                                    snap-host
                                </h1>
                                <p className="text-lg text-gray-400">
                                    Build and deploy React websites in a snap!
                                </p>
                            </div>
                            <div className="space-y-6 mb-8">
                                <FeatureItem
                                    icon={Zap}
                                    title="One-click Deploy"
                                    description="Deploy your site with a single click, no complex setups required."
                                />
                                <FeatureItem
                                    icon={GitBranch}
                                    title="Git Integration"
                                    description="Seamless integration with your Git repositories for easy version control."
                                />
                                <FeatureItem
                                    icon={BarChart3}
                                    title="Real-time Logs"
                                    description="Monitor your application's performance with live logging and analytics."
                                />
                            </div>
                        </div>
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-gray-400 text-sm">
                                Ready to revolutionize your web deployment?
                            </p>
                            <Button
                                className="w-full sm:w-auto bg-white hover:bg-gray-100 text-black transition-all duration-200"
                                size="lg"
                            >
                                Get Started Now
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="md:w-2/5 bg-black p-8 md:p-12 flex items-center justify-center border-t md:border-t-0 md:border-l border-[#222]">
                        <SignIn />
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-white text-black">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <div>
                <h3 className="text-lg font-medium text-white">{title}</h3>
                <p className="mt-1 text-sm text-gray-400">{description}</p>
            </div>
        </div>
    );
}
