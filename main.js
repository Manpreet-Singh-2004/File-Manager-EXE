const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'icon.ico'), // Icon path
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
            enableRemoteModule: false,
            sandbox: false
        }
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');
    
    // Uncomment for debugging
    // mainWindow.webContents.openDevTools();

    // Handle window state changes
    mainWindow.on('minimize', () => {
        console.log('Window minimized');
    });

    mainWindow.on('restore', () => {
        console.log('Window restored');
        mainWindow.webContents.focus();
    });

    mainWindow.on('focus', () => {
        console.log('Window focused');
    });

    // When window is shown
    mainWindow.on('show', () => {
        console.log('Window shown');
        mainWindow.focus();
    });

    // Log window loading
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window content loaded');
        mainWindow.focus();
    });
}

// Create window when ready
app.whenReady().then(() => {
    console.log('App ready, creating window');
    createWindow();
});

// Handle window activation
app.on('activate', () => {
    console.log('App activated');
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    } else {
        mainWindow.focus();
    }
});

// Handle all windows closed
app.on('window-all-closed', () => {
    console.log('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle before quit
app.on('before-quit', () => {
    console.log('App quitting');
});