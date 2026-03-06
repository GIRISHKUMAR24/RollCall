import { spawn, execSync } from "child_process";
import fs from "fs";
import net from "net";

const DEV_PORT = 4000;

/** Returns true if something is already listening on the port */
function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const probe = net.createConnection({ port, host: "127.0.0.1" });
        probe.once("connect", () => { probe.destroy(); resolve(true); });
        probe.once("error", () => resolve(false));
    });
}

/** Kill whatever process is holding the port (Windows) */
function killPortProcess(port: number): void {
    try {
        const out = execSync(`netstat -ano | findstr :${port}`, {
            encoding: "utf8",
        });
        const lines = out.split("\n").filter((l) => l.includes("LISTENING"));
        for (const line of lines) {
            const pid = line.trim().split(/\s+/).pop();
            if (pid && pid !== "0") {
                try {
                    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
                    console.log(`🛑 Killed PID ${pid} (was holding port ${port})`);
                } catch { /* already gone */ }
            }
        }
    } catch { /* port wasn't in use */ }
}

async function startPublicServer() {
    console.log("🔄 Starting Cloudflare Tunnel + Vite Dev Server...\n");

    // ── Step 1: Free the port if occupied ────────────────────────────────
    if (await isPortInUse(DEV_PORT)) {
        console.log(`⚠️  Port ${DEV_PORT} is occupied. Freeing it...`);
        killPortProcess(DEV_PORT);
        await new Promise((r) => setTimeout(r, 2000));
    }

    // ── Step 2: Start cloudflared FIRST and wait for the HTTPS URL ───────
    //
    // WHY: env vars set in the parent process AFTER a child is spawned are
    // NOT visible to that child.  We must know the tunnel URL BEFORE we
    // spawn Vite, so we can pass it as part of Vite's environment.
    //
    console.log(
        "🔗 Starting Cloudflare tunnel (obtaining HTTPS URL before launching Vite)...",
    );

    const tunnel = spawn(
        "npx",
        ["-y", "cloudflared", "tunnel", "--edge-ip-version", "4", "--url", `http://localhost:${DEV_PORT}`],
        {
            shell: true,
            stdio: ["ignore", "pipe", "pipe"],
        },
    );

    tunnel.on("error", (err) => {
        console.error("❌ Failed to start cloudflared:", err.message);
        process.exit(1);
    });

    // Block until cloudflared prints the public HTTPS URL
    const tunnelUrl = await new Promise<string>((resolve, reject) => {
        const onData = (data: Buffer) => {
            const text = data.toString();
            // Ignore API urls that might appear in error messages
            const match = text.match(/https:\/\/(?!api\.)[a-zA-Z0-9-]+\.trycloudflare\.com/);
            if (match) {
                tunnel.stdout.off("data", onData);
                tunnel.stderr.off("data", onData);
                resolve(match[0]);
            }
        };
        tunnel.stdout.on("data", onData);
        tunnel.stderr.on("data", onData);
        tunnel.once("close", (code) => {
            if (code !== 0)
                reject(new Error(`cloudflared exited with code ${code}`));
        });
    });

    // Persist tunnel URL to file
    try { fs.writeFileSync("tunnel_url.txt", tunnelUrl); } catch { /* ignore */ }

    console.log("\n✅ HTTPS Tunnel URL obtained!");
    console.log(`🌐 Public URL: ${tunnelUrl}`);
    console.log(`📧 Email links will use: ${tunnelUrl}/scan/from-email?token=...`);
    console.log("✨ No password required.\n");

    // ── Step 3: Start Vite WITH the tunnel URL baked into its environment ─
    //
    // This is the critical fix: PUBLIC_BASE_URL and APP_BASE_URL are passed
    // directly to the Vite child process, so emailService.getBaseUrl() inside
    // Vite will ALWAYS return the HTTPS tunnel URL — never the local IP.
    //
    console.log("🚀 Starting Vite dev server (with HTTPS URL in environment)...");

    const vite = spawn(
        "npx",
        ["vite", "--port", String(DEV_PORT), "--host", "0.0.0.0"],
        {
            shell: true,
            stdio: "inherit",
            env: {
                ...process.env,
                PUBLIC_BASE_URL: tunnelUrl, // Priority 1 in emailService.getBaseUrl()
                APP_BASE_URL: tunnelUrl,    // Priority 2
            },
        },
    );

    vite.on("error", (err) => {
        console.error("❌ Vite failed to start:", err.message);
        process.exit(1);
    });

    // Watch for tunnel going down
    tunnel.on("close", (code) => {
        if (code !== null && code !== 0) {
            console.error(`\n⚠️  Cloudflare tunnel exited (code ${code}). Stopping.`);
            try { vite.kill(); } catch { /* ignore */ }
            process.exit(code);
        }
    });

    // ── Step 4: Graceful shutdown ─────────────────────────────────────────
    const shutdown = () => {
        console.log("\n🛑 Shutting down tunnel and dev server...");
        try { tunnel.kill(); } catch { /* ignore */ }
        try { vite.kill(); } catch { /* ignore */ }
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

startPublicServer();
