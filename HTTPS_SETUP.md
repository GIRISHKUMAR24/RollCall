# HTTPS Setup Guide

This guide explains how to enable secure HTTPS access for the Attendance Management System, which is required for **Geolocation** and **Camera** APIs in modern browsers.

---

## Why HTTPS is Required

Modern browsers block `navigator.geolocation` and `MediaDevices.getUserMedia` (camera) on non-secure origins unless you are on `localhost`. If students access the app via a **local IP address** (e.g., `http://192.168.x.x:4000`) on mobile, it will **not work**.

✅ **Solutions:**
1. Use an HTTPS tunnel (ngrok or Cloudflare) — **recommended for development**
2. Run the server with self-signed certificates — **for LAN/local HTTPS**

---

## Option 1: HTTPS Tunnel (Recommended — Zero Configuration)

### 🔵 Cloudflare Tunnel (No account needed, free HTTPS)

```bash
# Already built-in! Just run:
npm run share
```

This starts a Cloudflare tunnel and prints a public HTTPS URL like:
```
🌐 Public URL: https://abc-def-123.trycloudflare.com
```

Share that URL with students — it provides full HTTPS with no certificate warnings.

---

### 🟠 ngrok Tunnel (Requires free account)

1. Install ngrok: https://ngrok.com/download  
2. Authenticate once: `ngrok config add-authtoken YOUR_TOKEN`
3. Start your app normally: `npm run dev`
4. In a second terminal: `ngrok http 4000`

ngrok will print an HTTPS URL like:
```
https://abc123.ngrok-free.app → http://localhost:4000
```

---

## Option 2: Self-Signed Certificates (LAN HTTPS)

Use this if you want to run the production server with HTTPS directly (no tunnel).

### Step 1: Generate Certificates

**Prerequisites:** Node.js 15+ (already required for this project)

```bash
npm run generate-certs
```

This script automatically:
- Detects if OpenSSL is available in PATH and uses it
- Falls back to Git Bash / WSL instructions if OpenSSL is not found
- Creates the `certs/` directory automatically
- Prints clear next steps

> **If the script says OpenSSL not found:**
> - **Option A:** Install [Win32 OpenSSL](https://slproweb.com/products/Win32OpenSSL.html) and add to PATH, then re-run
> - **Option B:** Open **Git Bash** (comes with OpenSSL) and run `npm run generate-certs`
> - **Option C:** Use WSL: `wsl -e npm run generate-certs`
> - **Option D (easiest):** Just use `npm run share` (Cloudflare tunnel, no certs needed!)

This creates:
```
certs/
  key.pem   ← Private key (never commit this!)
  cert.pem  ← Self-signed certificate
```

### Step 2: Enable HTTPS in .env

Open `.env` and set:
```ini
USE_HTTPS=true
PORT=4000
```

### Step 3: Start the HTTPS Server

```bash
npm run build        # Build frontend + backend
npm start            # Starts with HTTPS if USE_HTTPS=true
```

Or use the shortcut:
```bash
npm run start:https  # Forces HTTPS regardless of .env
```

### Step 4: Trust the Certificate (First Time Only)

When you open `https://localhost:4000` in Chrome, you'll see a security warning.

- **Chrome:** Click "Advanced" → "Proceed to localhost (unsafe)"
- **Mobile Chrome/Android:** This won't work directly with self-signed certs. Use a tunnel instead.
- **To properly trust:** Add `certs/cert.pem` to your OS trusted certificate store.

---

## Option 3: ngrok / Cloudflare Tunnel with Production Build

If you want to expose a production build via tunnel:

```bash
# 1. Build the app
npm run build

# 2. Start HTTP server locally
npm start

# 3. In another terminal, create tunnel
npx cloudflared tunnel --url http://localhost:4000
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Port to listen on |
| `USE_HTTPS` | `false` | Set `true` to use HTTPS with certs/key.pem + certs/cert.pem |
| `ALLOWED_ORIGINS` | _(empty)_ | Comma-separated extra CORS origins (e.g., your fixed tunnel URL) |
| `NODE_ENV` | `development` | Set `production` for production mode |
| `VITE_DISABLE_HMR` | `false` | Set `true` when accessing via tunnel to prevent HMR WebSocket errors |
| `VITE_APP_BASE_URL` | _(empty)_ | Override API base URL. Leave empty to use relative `/api` paths |

---

## CORS Configuration

The backend automatically allows:
- `http://localhost` and `https://localhost` (any port)
- `http://127.0.0.1` and `https://127.0.0.1` (any port)
- All `*.ngrok-free.app`, `*.ngrok.app`, `*.ngrok.io` domains (ngrok v2 + v3)
- All `*.trycloudflare.com` and `*.cloudflareaccess.com` domains
- Local LAN IP ranges: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x` (for LAN HTTPS)
- Any origins listed in `ALLOWED_ORIGINS` env var
- **All origins in development mode** (`NODE_ENV=development`)

No hardcoded IPs or URLs needed. API paths are **relative** (`/api/...`), so they work regardless of domain.

---

## Frontend Secure Context Detection

### SecureContextBanner Component

A reusable `<SecureContextBanner />` component is available at `client/components/SecureContextBanner.tsx`.

It automatically:
- Detects if `window.isSecureContext` is `false` AND hostname is not `localhost`
- Shows a red warning banner: *"Secure HTTPS connection required for location and camera access."*
- Provides links to ngrok and Cloudflare documentation
- Can be dismissed by the user (X button)
- Includes a collapsible **Debug Info** panel showing:
  - ✅ **Secure Context:** Yes/No
  - 🔗 **Protocol:** https: / http:
  - 🌐 **Origin:** current page origin
  - 🏠 **Localhost:** Yes/No

**Usage:**
```tsx
import SecureContextBanner from "@/components/SecureContextBanner";

// Shows warning only when insecure:
<SecureContextBanner />

// Always show debug panel:
<SecureContextBanner alwaysShowDebug />
```

**Integrated into:**
- `StudentDashboard.tsx` — shown in the main content area before the QR scanner
- `StudentQRScan.tsx` — inline debug info already present in the location section

---

## NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (HTTP, localhost only) |
| `npm run share` | Start Cloudflare tunnel + Vite with HTTPS URL set |
| `npm run generate-certs` | Generate self-signed certs (Node.js script, auto-detects OpenSSL) |
| `npm run generate-certs-openssl` | Direct OpenSSL command (requires OpenSSL in PATH) |
| `npm run build` | Build frontend + backend for production |
| `npm start` | Start production server (HTTP or HTTPS based on USE_HTTPS env) |
| `npm run start:https` | Force HTTPS production server regardless of .env |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Location blocked" on mobile | Use HTTPS tunnel (Cloudflare/ngrok) |
| Certificate warning in browser | Click Advanced → Proceed, or use a tunnel |
| `generate-certs` says OpenSSL not found | Open Git Bash or install OpenSSL, or use `npm run share` |
| CORS error in console | Add origin to `ALLOWED_ORIGINS` in `.env` |
| Mobile stuck on "Getting location..." | Ensure HTTPS; check GPS is enabled |
| HMR WebSocket errors in console | Set `VITE_DISABLE_HMR=true` in `.env` when using tunnel |
| `npm start` — module not found | Run `npm run build` first to compile the server |
