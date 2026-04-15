const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1100,
        minHeight: 700,
        backgroundColor: '#00000000',
        title: 'Zyneon Desktop',
        ...(process.platform === 'win32' ? {
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                color: '#00000000',
                symbolColor: '#ffffff',
                height: 39
            }
        } : {}),
        ...(process.platform === 'linux' ? {
            titleBarStyle: 'hidden',
        } : {}),
        backgroundMaterial: "acrylic",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/index.js'),
        },
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.webContents.on('before-input-event', (event, input) => {
        const isMac = process.platform === 'darwin';
        const openDevTools =
            input.type === 'keyDown' &&
            (
                input.key === 'F12' ||
                (!isMac && input.control && input.shift && input.key.toUpperCase() === 'I') ||
                (isMac && input.meta && input.alt && input.key.toUpperCase() === 'I')
            );

        if (openDevTools) {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
            }
            event.preventDefault();
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('window-control', (_event, action) => {
    if (!mainWindow) return;

    if (action === 'minimize') {
        mainWindow.minimize();
    } else if (action === 'maximize') {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    } else if (action === 'close') {
        mainWindow.close();
    }
});

ipcMain.handle('modrinth-search-projects', async (_event, payload = {}) => {
    const query = String(payload.query ?? '').trim();
    const limit = Math.min(Math.max(Number(payload.limit ?? 20), 1), 50);
    const offset = Math.max(Number(payload.offset ?? 0), 0);
    const facets = Array.isArray(payload.facets) && payload.facets.length > 0
        ? payload.facets
        : [["project_type:modpack"]];

    const params = new URLSearchParams({
        query,
        limit: String(limit),
        offset: String(offset),
        index: 'relevance',
        facets: JSON.stringify(facets),
    });

    const response = await fetch(`https://api.modrinth.com/v2/search?${params.toString()}`, {
        headers: {
            'User-Agent': 'ZyneonDesktop/Z1'
        }
    });

    if (!response.ok) {
        throw new Error(`Modrinth request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
});

