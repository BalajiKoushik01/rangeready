const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'GVB Tech - Precision RF Platform',
    backgroundColor: '#F8F7F4',
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const isPackaged = app.isPackaged;
  let pythonExecutable;
  let scriptPath;
  let args;

  if (isPackaged) {
    // In production, the backend uses the bundled portable Python
    pythonExecutable = path.join(process.resourcesPath, 'python_portable', 'python.exe');
    scriptPath = path.join(process.resourcesPath, 'app', 'backend', 'main.py');
    args = [scriptPath, '--port', '8787'];
  } else {
    // In development, use the virtual environment
    pythonExecutable = process.platform === 'win32' 
      ? path.join(__dirname, '../.venv/Scripts/python.exe')
      : path.join(__dirname, '../.venv/bin/python');
    scriptPath = path.join(__dirname, '../backend/main.py');
    args = [scriptPath, '--port', '8787'];
  }

  console.log(`Launching Backend from: ${pythonExecutable}`);
  backendProcess = spawn(pythonExecutable, args);

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
