const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

let mainWindow;
let splashWindow;
let backendProcess;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => (splashWindow = null));
}

function createMainWindow() {
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

  const isPendrive = process.env.PENDRIVE_MODE === 'true';
  const isDev = !isPendrive && (process.env.NODE_ENV === 'development' || !app.isPackaged);
  
  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  // Security Verification: Strictly restrict loading to local trusted loopback or filesystem
  if (!startUrl.startsWith('http://localhost') && !startUrl.startsWith('file://')) {
    console.error('CRITICAL SECURITY BREACH: Attempted to load unauthorized URL.');
    app.quit();
    return;
  }

  console.log(`Loading Dashboard from: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
    }
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const isPendrive = process.env.PENDRIVE_MODE === 'true';
  const isPackaged = app.isPackaged;
  let pythonExecutable;
  let scriptPath;
  let args;

  if (isPendrive) {
    // Pendrive Mode: Use relative path to portable python
    pythonExecutable = path.join(__dirname, '../RangeReady_OFFLINE/python/python.exe');
    scriptPath = path.join(__dirname, '../backend/main.py');
    args = [scriptPath, '--port', '8787'];
  } else if (isPackaged) {
    // Packaged Mode: Use resources path
    pythonExecutable = path.join(process.resourcesPath, 'python_portable', 'python.exe');
    scriptPath = path.join(process.resourcesPath, 'app', 'backend', 'main.py');
    args = [scriptPath, '--port', '8787'];
  } else {
    // Dev Mode
    pythonExecutable = process.platform === 'win32' 
      ? path.join(__dirname, '../.venv/Scripts/python.exe')
      : path.join(__dirname, '../.venv/bin/python');
    scriptPath = path.join(__dirname, '../backend/main.py');
    args = [scriptPath, '--port', '8787'];
  }

  console.log(`Launching Backend: ${pythonExecutable}`);
  backendProcess = spawn(pythonExecutable, args, {
    windowsHide: true, // Hide the console window on Windows
    shell: false
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });
}

function checkBackendReady(callback) {
  const checkInterval = setInterval(() => {
    // Snyk: ignore - This is a local loopback health check for the air-gapped backend service.
    // Transparent transmission on localhost is expected in our decoupled offline architecture.
    http.get('http://localhost:8787/health', (res) => {
      if (res.statusCode === 200) {
        clearInterval(checkInterval);
        callback();
      }
    }).on('error', () => {
      // Continue polling
    });
  }, 500);
}

app.whenReady().then(() => {
  createSplashWindow();
  startBackend();
  
  // Eager Launch: Show the main window immediately so the user can see the "Setup/Scanning" interface
  // while the backend initializes and they plug in hardware.
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
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
