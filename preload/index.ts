/**
 * @module preload
 */
 import { contextBridge, ipcRenderer } from "electron";
 import type { IpcRenderer, ContextBridge } from "electron";
 import type { ProcedureType } from "@trpc/server";
 
 export const exposeElectronTRPC = ({
   contextBridge,
   ipcRenderer,
 }: {
   contextBridge: ContextBridge;
   ipcRenderer: IpcRenderer;
 }) => {
   return contextBridge.exposeInMainWorld("electronTRPC", {
     rpc: (args: TRPCHandlerArgs) => ipcRenderer.invoke("electron-trpc", args),
   });
 };
 
 export interface TRPCHandlerArgs {
   path: string;
   type: ProcedureType;
   input?: unknown;
 }
 
 // if using electron-trpc package exposeElectronTRPC function errors with:
 // VM126 renderer_init:73 Unable to load preload script: C:\Users\nicky\projects\vite-electron-builder-modified\packages\preload\dist\index.cjs
 // (anonymous) @ VM126 renderer_init:73
 // VM126 renderer_init:73 Error: Imported server-only code in the browser
 //     at b (VM129 C:\Users\nicky\projects\vite-electron-builder-modified\node_modules\electron-trpc\dist\index.cjs:1:1519)
 //     at Module.<anonymous> (VM129 C:\Users\nicky\projects\vite-electron-builder-modified\node_modules\electron-trpc\dist\index.cjs:1:1573)
 //     at Module.<anonymous> (VM129 C:\Users\nicky\projects\vite-electron-builder-modified\node_modules\electron-trpc\dist\index.cjs:3:3)
 //     at Module._compile (VM97 loader:1120:14)
 //     at Module._extensions..js (VM97 loader:1175:10)
 //     at Module.load (VM97 loader:988:32)
 //     at Module._load (VM97 loader:829:12)
 //     at c._load (VM123 asar_bundle:5:13343)
 //     at i._load (VM126 renderer_init:33:356)
 //     at Module.require (VM97 loader:1012:19)
 // (anonymous) @ VM126 renderer_init:73
 // workaround: copy and paste the code it uses here
 
 process.once("loaded", async () => {
   exposeElectronTRPC({ contextBridge, ipcRenderer });
   // If you expose something here, you get window.something in the React app
   // contextBridge.exposeInMainWorld("something", {
   //   exposedThing: "this value was exposed via the preload file",
   // });
 });
 