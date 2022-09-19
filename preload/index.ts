import { contextBridge } from "electron";

console.log("preload/index");

process.once("loaded", async () => {
  // If you expose something here, you get window.something in the React app
  contextBridge.exposeInMainWorld("something", {
    exposedThing: "this value was exposed via the preload file",
  });
});
