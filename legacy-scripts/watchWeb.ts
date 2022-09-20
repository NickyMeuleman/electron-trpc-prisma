import { createServer, createLogger } from "vite";

// process.env.MODE is used in various vite config files
const mode = (process.env.MODE = process.env.MODE || "development");

/**
 * Setup server for `web`
 * On file changes: hot reload
 */
function createWebWatchServer() {
  const server = createServer({
    mode,
    customLogger: createLogger("info", { prefix: `[web]` }),
    configFile: "renderer/vite.config.ts",
  });

  return server;
}

async function main() {
  // start webserver
  const server = await createWebWatchServer();
  await server.listen();
  server.printUrls();

  return server;
}

export const listeningWebServer = main();
