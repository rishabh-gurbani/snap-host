"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react"; // Add this import
import { useState } from "react"; // Add this import

export default function SignOutButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSignout = async () => {
        try {
            setIsLoading(true);
            await authClient.signOut();
            router.push("/");
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleSignout}
            disabled={isLoading}
            className="text-gray-400 hover:text-white border border-transparent hover:border-[#333] hover:bg-[#111]/50 transition-colors gap-2"
        >
            <LogOut className="h-4 w-4" />
            <span className={isLoading ? "opacity-0" : "opacity-100"}>
                Sign Out
            </span>
            {isLoading && (
                <span className="absolute left-1/2 -translate-x-1/2 block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
        </Button>
    );
}
