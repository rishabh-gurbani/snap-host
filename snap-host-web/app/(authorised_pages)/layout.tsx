import { ReactNode } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SignOutButton from "../../components/sign-out";

export default async function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) redirect("/");

    const user = session.user;

    return (
        <div className="min-h-screen bg-black text-white">
            <nav className="sticky top-0 z-50 backdrop-blur-sm border-b border-[#222222]/80 bg-black/60">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex justify-between items-center">
                        <Link 
                            href="/dashboard" 
                            className="text-2xl font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:from-white hover:to-gray-300 transition-all"
                        >
                            sh
                        </Link>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#111]/50 border border-[#333]/50">
                                <Avatar className="h-8 w-8 transition-transform hover:scale-105">
                                    <AvatarImage
                                        src={user.image || "https://github.com/shadcn.png"}
                                        alt={user.name || "User"}
                                    />
                                    <AvatarFallback>
                                        {user.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-gray-300 font-bold">
                                    {user.name}
                                </span>
                            </div>
                            <SignOutButton />
                        </div>
                    </div>
                </div>
            </nav>
            <main className="container mx-auto py-8">{children}</main>
        </div>
    );
}
