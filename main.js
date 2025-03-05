const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let tray;
let breakWindow;
let settingsWindow;
let strictMode = false;
let shortBreakInterval = 15 * 60 * 1000; // Default: 15 minutes (ms)
let longBreakInterval = 75 * 60 * 1000; // Default: 75 minutes (ms)
let shortBreakDuration = 15 * 1000; // Default: 15 seconds (ms)
let longBreakDuration = 60 * 1000; // Default: 60 seconds (ms)
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

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
    }
);

const shortBreakExercises = [
    'Tightly close your eyes',
    'Roll your eyes a few times to each side',
    'Rotate your eyes in a clockwise direction',
    'Rotate your eyes in a counterclockwise direction',
    'Blink rapidly for 10 seconds, then close your eyes',
    'Focus on a distant object for 20 seconds',
    'Drink a glass of water',
];

const longBreakExercises = [
    'Walk for a while',
    'Lean back at your seat and relax',
    'Stretch your arms and shoulders',
    'Stand up and do a few squats',
    'Practice deep breathing',
    'Shake out your hands and wrists',
];

function getRandomExercise(breakType) {
    return breakType === 'short'
        ? shortBreakExercises[
              Math.floor(Math.random() * shortBreakExercises.length)
          ]
        : longBreakExercises[
              Math.floor(Math.random() * longBreakExercises.length)
          ];
}

function showFullScreenBreak(breakType) {
    breakWindow = new BrowserWindow({
        fullscreen: true,
        alwaysOnTop: true,
        frame: false,
        transparent: true,
        backgroundColor: '#524d4d',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, './preloads/preload_break.js'),
        },
    });

    breakWindow.loadFile(path.join(__dirname, 'public/break.html'));

    breakWindow.setFullScreen(true);

    breakWindow.on('closed', () => {
        breakWindow = null; // Reset break window reference
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
        resizable: false,
        title: "SafeEyes Settings",
        webPreferences: { 
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, './preloads/preload_settings.js'), 
        },
    });

    settingsWindow.loadFile(path.join(__dirname, 'public/settings.html'));

    settingsWindow.on("closed", () => {
        settingsWindow = null;
    });
}


app.whenReady().then(() => {
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
                click: () => showFullScreenBreak('short'),
            },
            { label: 'Exit', click: () => app.quit() },
        ])
    );
});

// Prevent app from quitting when windows are closed
app.on('window-all-closed', (event) => {
    event.preventDefault(); // Prevent quitting
});
