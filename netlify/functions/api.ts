import serverless from "serverless-http";
import { createServer } from "../../server/index";

// Create the express app from our shared server logic
const mainApp = createServer();

// We no longer need a complex wrapper app here because:
// 1. Path normalization is now handled inside mainApp in server/index.ts
// 2. CORS and OPTIONS preflights are already handled in mainApp.
// 3. This makes local dev and production behavior identical.

export const handler = serverless(mainApp);
