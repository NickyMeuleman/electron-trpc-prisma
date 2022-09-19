import { defineConfig } from "vite";
import { builtinModules } from "module";

const PACKAGE_ROOT = __dirname;
console.log("MAIN", { root: PACKAGE_ROOT, env: process.cwd() });

// https://vitejs.dev/config/
// import.meta vite specific vars have not been injected yet here.
// for example: import.meta.env.MODE isn't available and automatically gets set to "production" during vite build
// to override that behaviour: set an env MODE variable and pass a mode: process.env.MODE to the vite config
// https://vitejs.dev/guide/env-and-mode.html

export default defineConfig({
  root: PACKAGE_ROOT,
  envDir: process.cwd(),

  build: {
    target: "node16",
    sourcemap: "inline",
    outDir: "../dist/main",
    emptyOutDir: true,
    assetsDir: ".",
    // set to development in the watch script
    minify: process.env.MODE !== "development",
    lib: {
      entry: "index.ts",
      formats: ["cjs"],
    },
    rollupOptions: {
      external: [
        // Exclude Electron from built output
        "electron",
        // Exclude Node builtin modules.
        ...builtinModules.flatMap((p) => [p, `node:${p}`]),
      ],
      output: {
        entryFileNames: "[name].cjs",
      },
    },
    reportCompressedSize: false,
  },
});
