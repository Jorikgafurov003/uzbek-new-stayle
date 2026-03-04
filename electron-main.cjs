const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let serverProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Uzbechka Admin & POS"
  });

  // In production, we point to the local express server
  // In dev, we might point to localhost:3000
  win.loadURL('http://localhost:3000');
  
  win.on('closed', () => {
    if (serverProcess) serverProcess.kill();
  });
}

app.whenReady().then(() => {
  // Start the express server as a background process
  serverProcess = fork(path.join(__dirname, 'server.ts'), [], {
    execArgv: ['--loader', 'tsx'],
    env: { ...process.env, NODE_ENV: 'production', IS_ELECTRON: 'true' }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});
