import electronPath from "electron";
import { build } from "vite";
import type { ViteDevServer } from "vite";
import { spawn } from "child_process";
import type { ChildProcess } from "child_process";
// TODO: figure out how to import a ts file when using modules for top-level await
import { listeningWebServer } from "./watchWeb";

// process.env.MODE is used in various vite config files
const mode = (process.env.MODE = process.env.MODE || "development");

/**
 * Setup watcher for `desktop/preload`
 * On file changes: reload the web page
 */
function createPreloadWatcher(viteServer: ViteDevServer) {
  const watcher = build({
    mode,
    configFile: "preload/vite.config.ts",
    build: {
      /**
       * Set to {} to enable rollup watcher
       * @see https://vitejs.dev/config/build-options.html#build-watch
       */
      watch: {},
    },
    plugins: [
      {
        name: "web-reload-on-preload-change",
        writeBundle() {
          viteServer.ws.send({ type: "full-reload" });
        },
      },
    ],
  });

  return watcher;
}

/**
 * Setup watcher for `desktop/main`
 * On file changes: shut down and relaunch electron
 */
function createMainWatcher() {
  let electronProcess: ChildProcess | null = null;

  const watcher = build({
    mode,
    configFile: "main/vite.config.ts",
    build: {
      /**
       * Set to {} to enable rollup watcher
       * @see https://vitejs.dev/config/build-options.html#build-watch
       */
      watch: {},
    },
    plugins: [
      {
        name: "full-reload-on-main-change",
        writeBundle() {
          /** Kill electron if process already exist */
          if (electronProcess !== null) {
            electronProcess.removeListener("exit", process.exit);
            electronProcess.kill("SIGINT");
            electronProcess = null;
          }

          /** Spawn new electron process */
          // I read the docs for spawn.options.stio and still don't know how it works
          // https://nodejs.org/api/child_process.html#optionsstdio
          electronProcess = spawn(String(electronPath), ["."], {
            stdio: "inherit",
          });

          /** Stops the watch script when the application has been quit */
          electronProcess.addListener("exit", process.exit);
        },
      },
    ],
  });

  return watcher;
}

async function main(webServerPromise: Promise<ViteDevServer>) {
  const webWatchServer = await webServerPromise;
  // set up VITE_DEV_SERVER_URL, the URL that's loaded into the electron browser during dev
  process.env.VITE_DEV_SERVER_URL = webWatchServer.resolvedUrls?.local[0];

  // start preload watcher
  await createPreloadWatcher(webWatchServer);
  // start main watcher
  await createMainWatcher();
}

main(listeningWebServer);
