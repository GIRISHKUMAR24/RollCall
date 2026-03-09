import serverless from "serverless-http";
import express from "express";
import { createServer } from "../../server";

const app = express();
const mainApp = createServer();

// In local Netlify dev, the path is sent as /.netlify/functions/api
app.use("/.netlify/functions/api", (req, res, next) => {
    if (!req.url.startsWith("/api")) {
        req.url = `/api${req.url}`;
    }
    mainApp(req, res, next);
});

app.use(mainApp);

export const handler = serverless(app);
