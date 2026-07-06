const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onDeepLinkAuth: (callback) => {
    ipcRenderer.on("deep-link-auth", (event, data) => callback(event, data));
  },
  removeDeepLinkAuth: () => {
    ipcRenderer.removeAllListeners("deep-link-auth");
  },
  // Auto update
  onUpdateAvailable: (cb) =>
    ipcRenderer.on("update-available", (_, info) => cb(info)),
  onUpdateNotAvailable: (cb) =>
    ipcRenderer.on("update-not-available", () => cb()),
  onDownloadProgress: (cb) =>
    ipcRenderer.on("update-download-progress", (_, p) => cb(p)),
  onUpdateDownloaded: (cb) =>
    ipcRenderer.on("update-downloaded", () => cb()),
  startUpdateDownload: () => ipcRenderer.invoke("start-update-download"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
});
