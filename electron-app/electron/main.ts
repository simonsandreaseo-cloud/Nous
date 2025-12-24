import { app, BrowserWindow, ipcMain, screen, desktopCapturer } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
            nodeIntegration: true, // For active-win/screenshot-desktop access might need this or use contextBridge
            contextIsolation: true,
        },
    })

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(process.env.DIST, 'index.html'))
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(createWindow)

import { captureAndBlurScreen, getActiveWindowInfo } from './activity-monitor'

let trackingInterval: NodeJS.Timeout | null = null
let activityCounter = 0
let lastCheckTime = Date.now()

// IPC Handlers for Tracker
ipcMain.handle('start-tracking', async (event, { projectId, userId }) => {
    console.log('Tracking started for:', projectId);

    if (trackingInterval) clearInterval(trackingInterval);

    // Reset activity
    activityCounter = 0;
    lastCheckTime = Date.now();

    // Start a 10-minute interval (600,000 ms)
    // For demo/dev purposes, let's use 1 minute (60,000 ms) or keep it configurable
    const INTERVAL_MS = 10 * 60 * 1000;

    trackingInterval = setInterval(async () => {
        const now = Date.now();
        const duration = now - lastCheckTime;

        // Calculate activity % (very simple placeholder logic: 100 events in 10 mins = 100%)
        // Real app would need global hooks, for now we simulate or use powerMonitor
        // Since global hooks are complex to setup here, we'll use a random simulation for the MVP demonstration
        // indicating where the real hook would go.
        const activityPercentage = Math.min(100, Math.floor(Math.random() * 100));

        const windowInfo = await getActiveWindowInfo();
        const screenshotBuffer = await captureAndBlurScreen();

        // Send to renderer for Supabase upload
        win?.webContents.send('capture-ready', {
            activityPercentage,
            windowTitle: windowInfo?.title || 'Unknown',
            appName: windowInfo?.owner?.name || 'Unknown',
            url: (windowInfo as any)?.url || '',
            screenshotBuffer,
            startTime: new Date(lastCheckTime).toISOString(),
            endTime: new Date(now).toISOString()
        });

        lastCheckTime = now;
        activityCounter = 0;
    }, INTERVAL_MS);

    return { status: 'active', startTime: new Date() };
});

ipcMain.handle('stop-tracking', async (event) => {
    console.log('Tracking stopped');
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    return { status: 'idle', endTime: new Date() };
});
