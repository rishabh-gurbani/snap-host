import * as fs from "fs";
import * as path from "path";

const SUSPICIOUS_COMMANDS = [
    "rm -rf /",
    "rm -rf *",
    "wget",
    "curl",
    "> /dev",
    "> /",
    "chmod 777",
    "sudo",
    "> ~/.ssh",
    "ssh-keygen",
    "eval",
    "exec",
    ";", // Command chaining
    "&&", // Command chaining
    "||", // Command chaining
    "`", // Command substitution
    "$(", // Command substitution
    "${", // Variable substitution
    "> /etc",
    "> /usr",
];

const SUSPICIOUS_ENV_PATTERNS = [
    "AWS_",
    "GITHUB_",
    "NPM_TOKEN",
    "SECRET",
    "PASSWORD",
    "PRIVATE_KEY",
];

export const ALLOWED_MIME_TYPES = new Set([
    // HTML
    "text/html",
    "application/xhtml+xml",

    // JavaScript
    "application/javascript",
    "text/javascript",
    "application/x-javascript",

    // CSS
    "text/css",

    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",

    // Fonts
    "font/woff",
    "font/woff2",
    "application/font-woff",
    "application/font-woff2",
    "font/ttf",
    "font/otf",

    // JSON
    "application/json",

    // Web Manifests
    "application/manifest+json",
    "text/cache-manifest",

    // Media
    "audio/mpeg",
    "video/mp4",
    "video/webm",

    // Web Assembly
    "application/wasm",

    // Source Maps
    "application/json+sourcemap",
]);

export function validatePackageJson(buildDir: string): void {
    const packageJsonPath = path.join(buildDir, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
        throw new Error("package.json not found");
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const scripts = packageJson.scripts || {};

    // Validate each script
    Object.entries(scripts).forEach(([scriptName, command]: [string, any]) => {
        if (typeof command !== "string") {
            throw new Error(`Invalid script command type for ${scriptName}`);
        }

        // Check for suspicious commands
        SUSPICIOUS_COMMANDS.forEach((suspicious) => {
            if (command.includes(suspicious)) {
                throw new Error(
                    `Suspicious command detected in script "${scriptName}": ${suspicious}`
                );
            }
        });

        // Check for environment variable access
        SUSPICIOUS_ENV_PATTERNS.forEach((pattern) => {
            if (
                command.includes(`$${pattern}`) ||
                command.includes(`%${pattern}%`)
            ) {
                throw new Error(
                    `Suspicious environment variable access in script "${scriptName}": ${pattern}`
                );
            }
        });

        // Check for shell injection patterns
        if (/[;&|]/.test(command)) {
            throw new Error(
                `Possible shell injection detected in script "${scriptName}"`
            );
        }
    });
}
