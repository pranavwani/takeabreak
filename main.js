const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    ipcMain,
    nativeImage
} = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let tray;
let breakWindow;
let settingsWindow;
let isBreakActive = false; // Flag to prevent overlapping breaks
let strictMode = false;
let shortBreakInterval = 15 * 60 * 1000; // Default: 15 minutes (ms)
let longBreakInterval = 75 * 60 * 1000; // Default: 75 minutes (ms)
let shortBreakDuration = 15 * 1000; // Default: 15 seconds (ms)
let longBreakDuration = 60 * 1000; // Default: 60 seconds (ms)
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

let shortBreakTimer, longBreakTimer; // Timers for scheduling breaks

// Load settings from file or apply defaults
function loadSettings() {
    if (fs.existsSync(settingsFilePath)) {
        const savedSettings = JSON.parse(fs.readFileSync(settingsFilePath));
        shortBreakInterval =
            savedSettings.shortBreakInterval ?? shortBreakInterval;
        longBreakInterval =
            savedSettings.longBreakInterval ?? longBreakInterval;
        shortBreakDuration =
            savedSettings.shortBreakDuration ?? shortBreakDuration;
        longBreakDuration =
            savedSettings.longBreakDuration ?? longBreakDuration;
        strictMode = savedSettings.strictMode ?? strictMode;
    } else {
        saveSettings(); // Save default settings if file does not exist
    }
}

// Schedule automatic breaks
function scheduleBreaks() {
    if (shortBreakTimer) clearInterval(shortBreakTimer);
    if (longBreakTimer) clearInterval(longBreakTimer);

    shortBreakTimer = setInterval(
        () => showFullScreenBreak('short'),
        shortBreakInterval
    );
    longBreakTimer = setInterval(
        () => showFullScreenBreak('long'),
        longBreakInterval
    );
}

// Start scheduling breaks on app launch
scheduleBreaks();

// Save settings to file
function saveSettings() {
    const settings = {
        shortBreakInterval,
        longBreakInterval,
        shortBreakDuration,
        longBreakDuration,
        strictMode,
    };
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 4)); // Pretty JSON
}

// Load settings on app startup
loadSettings();

// Function to play sound
function playSound(soundFile) {
    const soundPath = path.join(__dirname, 'assets', soundFile);
    
    if (process.platform === 'darwin') {
        // macOS uses afplay
        exec(`afplay "${soundPath}"`, (error, stdout, stderr) => {
            if (!error) {
                console.log(error)
            }
        }); 
    } else if (process.platform === 'win32') {
        // Windows uses PowerShell
        exec(`powershell -c (New-Object Media.SoundPlayer "${soundPath}").PlaySync();`, (error, stdout, stderr) => {
            if (!error) {
                console.log(error)
            }
        }); 
    }
}

ipcMain.handle('getSettings', () => ({
    shortBreakInterval,
    longBreakInterval,
    shortBreakDuration,
    longBreakDuration,
    strictMode,
}));

ipcMain.handle(
    'updateSettings',
    (
        event,
        shortInterval,
        longInterval,
        shortDuration,
        longDuration,
        strictModeValue
    ) => {
        shortBreakInterval = shortInterval;
        longBreakInterval = longInterval;
        shortBreakDuration = shortDuration;
        longBreakDuration = longDuration;
        strictMode = strictModeValue;
        saveSettings();
        scheduleBreaks(); // Restart scheduling with new settings
    }
);

function showFullScreenBreak(breakType) {
    if (isBreakActive) return; // Prevent multiple breaks at the same time
    isBreakActive = true;

    playSound("on_pre_break.wav"); // Play start sound

    breakWindow = new BrowserWindow({
        fullscreen: true,
        alwaysOnTop: true,
        frame: false,
        transparent: true,
        backgroundColor: '#524d4d',
        resizable: false,
        useContentSize: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './preloads/preload_break.js'),
            additionalArguments: [`--breakType=${breakType}`] // Pass break type
        },
    });

    breakWindow.loadFile(path.join(__dirname, 'public/break.html'));

    breakWindow.setFullScreen(true);

    breakWindow.on('closed', () => {
        breakWindow = null; // Reset break window reference
        isBreakActive = false; // Reset flag
        playSound("on_stop_break.wav"); // Play end sound when break closes
    });

    setTimeout(
        () => {
            if (breakWindow) breakWindow.close();
        },
        breakType === 'short' ? shortBreakDuration : longBreakDuration
    );
}

// IPC Handlers to Close Break Window
ipcMain.handle('skipBreak', () => {
    if (breakWindow) breakWindow.close();
});
ipcMain.handle('endBreak', () => {
    if (breakWindow) breakWindow.close();
});

function openSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 450,
        height: 520, // Fixed height to prevent scrolling
        resizable: false, // Prevent window resizing
        title: 'TakeABreak Settings',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './preloads/preload_settings.js'),
        },
    });

    settingsWindow.loadFile(path.join(__dirname, 'public/settings.html'));

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

app.whenReady().then(() => {
    // Set app icon for macOS Dock
    if (process.platform === 'darwin') {
        const appIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.icns'));
        app.dock.setIcon(appIcon); // Set Dock icon
    }

    // Hide Dock icon on macOS
    app.dock.hide();

    tray = new Tray(path.join(__dirname, 'assets/tray-icon-light.png'));
    tray.setContextMenu(
        Menu.buildFromTemplate([
            { label: 'Settings', click: () => openSettingsWindow() },
            {
                label: 'Strict Mode',
                type: 'checkbox',
                checked: strictMode,
                click: (item) => {
                    strictMode = item.checked;
                    saveSettings();
                },
            },
            {
                label: 'Take a Break Now',
                click: () => showFullScreenBreak('long'),
            },
            { label: 'Exit', click: () => app.quit() },
        ])
    );
});

// Prevent app from quitting when windows are closed
app.on('window-all-closed', (event) => {
    event.preventDefault(); // Prevent quitting
});
