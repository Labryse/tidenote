const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
app.commandLine.appendSwitch('disable-features', 'NetworkServiceInProcess')
app.commandLine.appendSwitch('enable-features', 'NetworkService')


const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 768,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Mac'te native görünüm
    backgroundColor: '#0F172A',  // dark mode başlangıç rengi
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false
    },
    icon: path.join(__dirname, '../public/icon.png'), // sonra eklenecek
    show: false // hazır olunca göster (beyaz flash engeli)
  })

  // Hazır olunca göster
  win.once('ready-to-show', () => {
    win.show()
  })

  // Dev modda Vite dev server'ı yükle
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Harici linkleri tarayıcıda aç
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Native menüyü gizle (uygulama kendi UI'ını kullanıyor)
Menu.setApplicationMenu(null)

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
