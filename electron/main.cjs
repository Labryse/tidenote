const { app, BrowserWindow, shell, Menu, ipcMain } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log/main");

// Updater loglarını dosyaya yaz (%LOCALAPPDATA%\tidenote-updater\logs\ ...)
log.transports.file.level = "info";
autoUpdater.logger = log;

// Auto updater ayarları
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

function setupAutoUpdater(win) {
  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update-available", { version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    win.webContents.send("update-not-available");
  });

  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("update-download-progress", {
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update-downloaded");
  });

  autoUpdater.on("error", (err) => {
    console.error("Updater error:", err);
  });

  ipcMain.handle("start-update-download", () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.handle("install-update", () => {
    // Renderer "yeniden başlatılıyor" ekranını göstersin diye kısa gecikme,
    // sonra ASISTANLI (isSilent=false) kurulumu başlat: NSIS çalışan uygulamayı
    // kendisi kapatıp dosyaları güvenle değiştirir ve kilitli dosyada sessizce
    // patlamak yerine yeniden dener; isForceRunAfter kurulum sonrası uygulamayı açar.
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 400);
  });

  ipcMain.handle("check-for-updates", () => {
    autoUpdater.checkForUpdates();
  });

  // Uygulama açılınca 3 sn sonra kontrol et
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);
}

// 'tidenote://' protokolünü kaydet
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(
      "tidenote",
      process.execPath,
      [path.resolve(process.argv[1])]
    );
  }
} else {
  app.setAsDefaultProtocolClient("tidenote");
}

let mainWindow;

// Windows'ta deep link yakalama
// (Windows'ta second-instance event kullanılır)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    // Windows'ta URL second-instance'ta gelir
    const url = commandLine.find((arg) => arg.startsWith("tidenote://"));
    if (url) handleDeepLink(url);

    // Ana pencereyi öne getir
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Mac'te deep link yakalama
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Deep link handler
function handleDeepLink(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "auth") {
      const accessToken = urlObj.searchParams.get("accessToken");
      if (accessToken) {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send("deep-link-auth", { accessToken });
          }
        });
      }
    }
  } catch (e) {
    console.error("Deep link error:", e);
  }
}

ipcMain.handle("open-external", async (event, url) => {
  await shell.openExternal(url);
});

app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");
app.commandLine.appendSwitch("disable-features", "NetworkServiceInProcess");
app.commandLine.appendSwitch("enable-features", "NetworkService");

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 768,
    minHeight: 600,
    titleBarStyle: "hiddenInset", // Mac'te native görünüm
    backgroundColor: "#0F172A", // dark mode başlangıç rengi
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, "../public/icon.png"),
    show: false, // hazır olunca göster (beyaz flash engeli)
  });

  // Hazır olunca göster
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Dev modda Vite dev server'ı yükle
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Harici linkleri tarayıcıda aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Auto updater'ı başlat
  setupAutoUpdater(mainWindow);
}

// Native menüyü gizle (uygulama kendi UI'ını kullanıyor)
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
