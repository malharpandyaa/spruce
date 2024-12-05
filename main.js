// main.js
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let windows = {
  clipboard: null,
  notes: null,
  tasks: null,
  dashboard: null,
  git: null, // Added Git window
};

let minimizedWindows = {
  clipboard: false,
  notes: false,
  tasks: false,
};

let sidebarWindow;
let activeProject = 'Default'; // Default project name

function createWindow(windowName, fileName, yPosition, windowHeight) {
  windows[windowName] = new BrowserWindow({
    width: 300,
    height: windowHeight,
    x: 0,
    y: yPosition,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true, // Consider setting to false in production
      contextIsolation: false, // Set to true and adjust code in production
    },
  });

  windows[windowName].loadFile(fileName);
  windows[windowName].setMenuBarVisibility(false);

  windows[windowName].on('closed', () => {
    windows[windowName] = null;
    if (sidebarWindow) {
      sidebarWindow.webContents.send('window-closed', windowName);
    }
  });

  // Send the active project to the window
  windows[windowName].webContents.on('did-finish-load', () => {
    windows[windowName].webContents.send('active-project', activeProject);
  });
}

function createDashboard() {
  windows.dashboard = new BrowserWindow({
    width: 400,
    height: 600,
    x: 100,
    y: 100,
    frame: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true, // Consider setting to false in production
      contextIsolation: false, // Set to true and adjust code in production
    },
  });

  windows.dashboard.loadFile('dashboard.html');
  windows.dashboard.setMenuBarVisibility(false);

  windows.dashboard.on('closed', () => {
    windows.dashboard = null;
  });

  // Send the current active project and list of projects
  windows.dashboard.webContents.on('did-finish-load', () => {
    windows.dashboard.webContents.send('initialize-dashboard', activeProject);
  });
}

function createGitWindow() {
  windows.git = new BrowserWindow({
    width: 600,
    height: 400,
    x: 200,
    y: 200,
    frame: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true, // Consider setting to false in production
      contextIsolation: false, // Set to true and adjust code in production
    },
  });

  windows.git.loadFile('git.html');
  windows.git.setMenuBarVisibility(false);

  windows.git.on('closed', () => {
    windows.git = null;
  });

  // Send the active project to the Git window
  windows.git.webContents.on('did-finish-load', () => {
    windows.git.webContents.send('active-project', activeProject);
  });
}

function createSidebar() {
  const display = screen.getPrimaryDisplay();
  const { height } = display.workAreaSize;

  sidebarWindow = new BrowserWindow({
    width: 50,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true, // Consider setting to false in production
      contextIsolation: false, // Set to true and adjust code in production
    },
  });

  sidebarWindow.loadFile('sidebar.html');
  sidebarWindow.setMenuBarVisibility(false);
}

function minimizeWindow(windowName) {
  if (windows[windowName]) {
    windows[windowName].hide();
    minimizedWindows[windowName] = true;
    sidebarWindow.webContents.send('window-minimized', windowName);
  }
}

function restoreWindow(windowName) {
  if (windows[windowName]) {
    windows[windowName].show();
    minimizedWindows[windowName] = false;
    sidebarWindow.webContents.send('window-restored', windowName);
  }
}

function switchProject(newProjectName) {
  activeProject = newProjectName;

  // Notify all windows of the project change
  Object.keys(windows).forEach((winName) => {
    if (windows[winName]) {
      windows[winName].webContents.send('active-project', activeProject);
    }
  });
}

app.whenReady().then(() => {
  createSidebar();

  const display = screen.getPrimaryDisplay();
  const { height } = display.workAreaSize;
  const windowHeight = height / 3;

  createWindow('clipboard', 'clipboard.html', 0, windowHeight);
  createWindow('notes', 'notes.html', windowHeight, windowHeight);
  createWindow('tasks', 'tasks.html', windowHeight * 2, windowHeight);

  // IPC listeners
  ipcMain.on('minimize-window', (event, windowName) => {
    minimizeWindow(windowName);
  });

  ipcMain.on('restore-window', (event, windowName) => {
    if (windowName === 'dashboard') {
      if (!windows.dashboard) {
        createDashboard();
      } else {
        windows.dashboard.show();
      }
    } else if (windowName === 'git') {
      if (!windows.git) {
        createGitWindow();
      } else {
        windows.git.show();
      }
    } else {
      restoreWindow(windowName);
    }
  });

  ipcMain.on('switch-project', (event, newProjectName) => {
    switchProject(newProjectName);
  });

  ipcMain.on('open-dashboard', () => {
    if (!windows.dashboard) {
      createDashboard();
    } else {
      windows.dashboard.show();
    }
  });

  ipcMain.on('open-git-window', () => {
    if (!windows.git) {
      createGitWindow();
    } else {
      windows.git.show();
    }
  });

  ipcMain.on('request-active-project', (event) => {
    event.sender.send('active-project', activeProject);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
