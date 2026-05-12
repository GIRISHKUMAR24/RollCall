import serverless from "serverless-http";
import express from "express";
import cors from "cors";
import { createServer } from "../../server";

// Initialize the main Express app
const mainApp = createServer();

// Create the wrapper app for Netlify
const app = express();

// 1. Path Rewriting & Diagnostic Middleware
// This ensures that whether we are hit via /api/* (redirect) or /.netlify/functions/api/* (direct),
// the internal request hits the mainApp with the /api prefix it expects.
app.use((req, res, next) => {
    // Standardize URL by removing the Netlify function base if present
    let path = req.url;
    if (path.startsWith("/.netlify/functions/api")) {
        path = path.replace("/.netlify/functions/api", "");
    }
    
    // Ensure path starts with /api for the mainApp
    if (!path.startsWith("/api")) {
        path = "/api" + (path.startsWith("/") ? "" : "/") + path;
    }
    
    req.url = path;
    next();
});

// 2. Explicit OPTIONS handler for Preflight requests
// This ensures OPTIONS requests are always handled even if they don't match a specific route
app.options("*", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    res.header("Access-Control-Max-Age", "86400");
    res.status(200).end();
});

// 3. Mount the main application
app.use(mainApp);

export const handler = serverless(app);
