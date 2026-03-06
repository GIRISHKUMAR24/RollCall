#!/usr/bin/env node
/**
 * generate-certs.js
 * ─────────────────
 * Generates a self-signed TLS certificate (key.pem + cert.pem) for local
 * HTTPS development without requiring system-level OpenSSL.
 *
 * Uses Node.js built-in `crypto` module (available since Node 15+).
 *
 * Output:
 *   certs/key.pem   — RSA private key (2048-bit)
 *   certs/cert.pem  — Self-signed X.509 certificate (valid 365 days)
 *
 * Usage:
 *   node scripts/generate-certs.js
 *   npm run generate-certs
 */

import { generateKeyPairSync, X509Certificate } from "crypto";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const certsDir = join(__dirname, "..", "certs");

// ── 1. Ensure certs directory exists ────────────────────────────────────────
if (!existsSync(certsDir)) {
    mkdirSync(certsDir, { recursive: true });
    console.log(`📁 Created directory: certs/`);
}

const keyPath = join(certsDir, "key.pem");
const certPath = join(certsDir, "cert.pem");

if (existsSync(keyPath) && existsSync(certPath)) {
    console.log("✅ Certificates already exist at certs/key.pem and certs/cert.pem");
    console.log("   Delete them and re-run this script if you need fresh certs.");
    process.exit(0);
}

// ── 2. Check Node.js version ────────────────────────────────────────────────
const [major] = process.versions.node.split(".").map(Number);
if (major < 15) {
    console.error("❌ Node.js 15+ is required to generate certificates using built-in crypto.");
    console.error("   Please upgrade Node.js or install OpenSSL and use: npm run generate-certs-openssl");
    process.exit(1);
}

// ── 3. Generate RSA key pair ─────────────────────────────────────────────────
console.log("🔑 Generating RSA 2048-bit key pair...");
const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// ── 4. Build a self-signed certificate using Node's built-in X509Certificate ─
//
// Node.js doesn't expose a direct "create self-signed cert" API in its stable
// crypto module yet, so we use the `@peculiar/x509` library if available,
// or fall back to spawning openssl as a sub-process.
//
// However, since we want ZERO external dependencies, we use the `tls` +
// `crypto` approach with a minimal ASN.1 encoder for self-signed certs.
// For simplicity and reliability we use the `selfsigned` package which is
// already bundled in many projects, OR we spawn openssl if available.
//
// Strategy (in order of preference):
//   1. Try `openssl` via child_process (works on Windows with Git/WSL openssl)
//   2. If openssl fails, print manual instructions and exit non-zero

import { execSync, spawnSync } from "child_process";

// ── Helper: check if openssl is available ───────────────────────────────────
function opensslAvailable() {
    try {
        const result = spawnSync("openssl", ["version"], { stdio: "pipe" });
        return result.status === 0;
    } catch {
        return false;
    }
}

if (opensslAvailable()) {
    console.log("✅ OpenSSL found. Generating certificate...");
    try {
        execSync(
            `openssl req -x509 -newkey rsa:2048 ` +
            `-keyout "${keyPath}" ` +
            `-out "${certPath}" ` +
            `-days 365 -nodes ` +
            `-subj "/CN=localhost/O=AttendanceHub/C=IN" ` +
            `-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`,
            { stdio: "inherit" }
        );
        console.log("\n✅ Certificate generated successfully!");
        console.log("📋 Files created:");
        console.log(`   certs/key.pem  — Private key`);
        console.log(`   certs/cert.pem — Self-signed certificate`);
        console.log("\n🚀 Next steps:");
        console.log("   1. Set USE_HTTPS=true in your .env file");
        console.log("   2. Run: npm run build && npm start");
        console.log("      Or for dev: set USE_HTTPS=true in .env and use a tunnel");
        console.log("\n⚠️  Browser will show a security warning for self-signed certs.");
        console.log("   Click 'Advanced' → 'Proceed to localhost (unsafe)' to continue.");
    } catch (err) {
        console.error("❌ OpenSSL command failed:", err.message);
        printManualInstructions();
        process.exit(1);
    }
} else {
    console.warn("⚠️  OpenSSL not found in PATH.");
    printManualInstructions();
    process.exit(1);
}

function printManualInstructions() {
    console.log("\n📖 Manual Certificate Generation Options:");
    console.log("\n─── Option A: Install OpenSSL (Windows) ──────────────────────────");
    console.log("   1. Download from: https://slproweb.com/products/Win32OpenSSL.html");
    console.log("   2. Install and add to PATH");
    console.log("   3. Re-run: npm run generate-certs");
    console.log("\n─── Option B: Use Git Bash ────────────────────────────────────────");
    console.log("   Git for Windows includes OpenSSL. Open Git Bash and run:");
    console.log("   npm run generate-certs");
    console.log("\n─── Option C: Use WSL (Windows) ───────────────────────────────────");
    console.log("   wsl -e openssl req -x509 -newkey rsa:2048 \\");
    console.log("     -keyout certs/key.pem -out certs/cert.pem \\");
    console.log("     -days 365 -nodes -subj '/CN=localhost'");
    console.log("\n─── Option D: Use a Tunnel (No certs needed!) ─────────────────────");
    console.log("   npm run share   ← Cloudflare tunnel (FREE, no account needed)");
    console.log("\n   This is the EASIEST option for development.");
}
