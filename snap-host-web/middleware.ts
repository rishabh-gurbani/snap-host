// middleware.js
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.S3_BASE_URL;

export async function middleware(req: NextRequest) {
    const url = req.nextUrl.clone();
    const host = req.headers.get("host");

    if (!host) return;

    const parts = host.split(".");
    let subdomain, resolvesTo;

    // Check for pattern: www.subdomain.rishabhgurbani.me
    if (parts.length === 4 && parts[0] !== "www" && parts[1] === "snap-host") {
        subdomain = parts[0];
    } else if (parts.length === 2 && parts[1].startsWith("localhost")) {
        subdomain = parts[0];
    }

    if (subdomain) {
        resolvesTo = `${BASE_URL}/${subdomain}${
            url.pathname === "/" ? "/index.html" : url.pathname
        }`;

        try {
            // Check if the resource exists in the S3 bucket
            // console.log(resolvesTo);
            const s3Response = await fetch(resolvesTo, { method: "HEAD" });
            if (s3Response.ok) {
                // Resource exists, proceed with rewrite
                return NextResponse.rewrite(new URL(resolvesTo));
            } else {
                // Resource does not exist, return custom error
                return new NextResponse(
                    JSON.stringify({
                        error: "The requested resource could not be found.",
                        path: url.pathname,
                    }),
                    {
                        status: 404,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }
        } catch (error) {
            // Handle fetch or other unexpected errors
            console.log(error);
            return new NextResponse(
                JSON.stringify({
                    error: "An unexpected error occurred while processing the request.",
                    details: error,
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/:path*", // Apply middleware to all routes
};
