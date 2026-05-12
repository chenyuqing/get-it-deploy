"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("update", {
  status: () => ipcRenderer.invoke("update:status"),
  install: () => ipcRenderer.invoke("update:install"),
  dismiss: (didUpdate) => ipcRenderer.invoke("update:dismiss", didUpdate),
  onProgress: (cb) => {
    const wrapped = (_e, p) => cb(p);
    ipcRenderer.on("update-progress", wrapped);
    return () => ipcRenderer.removeListener("update-progress", wrapped);
  },
});
