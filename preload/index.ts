import { contextBridge, ipcRenderer } from "electron";
import type { IpcRenderer, ContextBridge } from "electron";
import type { Operation } from "@trpc/client";

export type IPCRequestOptions = Operation;

export const exposeElectronTRPC = ({
  contextBridge,
  ipcRenderer,
}: {
  contextBridge: ContextBridge;
  ipcRenderer: IpcRenderer;
}) => {
  return contextBridge.exposeInMainWorld("electronTRPC", {
    rpc: (opts: IPCRequestOptions) => ipcRenderer.invoke("electron-trpc", opts),
  });
};

process.once("loaded", () => {
  exposeElectronTRPC({ contextBridge, ipcRenderer });
  // If you expose something here, you get window.something in the React app
  // contextBridge.exposeInMainWorld("something", {
  //   exposedThing: "this value was exposed via the preload file",
  // });
});
