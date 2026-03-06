import { spawn } from "child_process";
import fs from "fs";

async function startDevTunnel() {
    const port = 4000;

    console.log("🔄 Starting Cloudflare Tunnel...");
    console.log("⏳ This may take a few seconds to initialize...");

    // Start Cloudflare Tunnel using npx
    const tunnel = spawn("npx", ["-y", "cloudflared", "tunnel", "--url", `http://localhost:${port}`], {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
    });

    let tunnelUrl = "";
    let serverStarted = false;

    const onData = (data: Buffer) => {
        const output = data.toString();
        // console.log(output); // Debugging

        // Regex to find the trycloudflare.com URL
        const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);

        if (match && !tunnelUrl) {
            tunnelUrl = match[0];
            console.log("\n✅ Public Tunnel Created Successfully!");
            console.log(`🌐 Public URL: ${tunnelUrl}`);
            console.log("✨ Secure HTTPS context enabled for Geolocation.\n");

            // Write URL to file for the agent to read if needed
            try {
                fs.writeFileSync('tunnel_url.txt', tunnelUrl);
            } catch (e) {
                console.error("Failed to write tunnel URL to file:", e);
            }

            // Set the environment variable for the email service
            process.env.PUBLIC_BASE_URL = tunnelUrl;
            process.env.APP_BASE_URL = tunnelUrl;
            process.env.PORT = port.toString();
            // Don't set VITE_APP_BASE_URL unless we want to force absolute URLs in frontend
            // process.env.VITE_APP_BASE_URL = tunnelUrl; 

            if (!serverStarted) {
                serverStarted = true;
                // Start the dev server
                console.log("🚀 Starting Vite development server...");

                // Spawn npm run dev
                // We use shell: true to handle 'npm' command on Windows
                const devServer = spawn("npm", ["run", "dev"], {
                    shell: true,
                    stdio: "inherit",
                    env: { ...process.env, VITE_DISABLE_HMR: 'true' }
                });

                devServer.on("close", (code) => {
                    console.log(`Development server exited with code ${code}`);
                    tunnel.kill();
                    process.exit(code || 0);
                });
            }
        }
    };

    tunnel.stdout.on("data", onData);
    tunnel.stderr.on("data", onData);

    tunnel.on("close", (code) => {
        if (code !== 0) {
            console.log(`⚠️ Tunnel process exited with code ${code}`);
            process.exit(code || 1);
        }
    });

    // Handle process termination
    process.on("SIGINT", () => {
        tunnel.kill();
        process.exit();
    });
}

startDevTunnel();
