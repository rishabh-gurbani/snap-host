"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import Link from "next/link";

export default function CreateProjectButton() {
    return (
        <Link href={"/new"}>
            <Button className="bg-white hover:bg-gray-100 text-black px-6 py-2 font-bold flex items-center gap-2 transition-all duration-200">
                <PlusIcon className="w-5 h-5" />
                Create Project
            </Button>
        </Link>
    );
}
