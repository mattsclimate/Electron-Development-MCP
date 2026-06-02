import { z } from "zod";

const WINDOW_STATE_CODE = `
// Step 1: Install electron-store
// npm install electron-store

import Store from 'electron-store';
import { BrowserWindow } from 'electron';

// Define schema for window state
const store = new Store({
  name: 'window-state',
  defaults: {
    bounds: { width: 800, height: 600 }
  }
});

export function restoreWindowState() {
  const needsMigration = false; // Add logic if needed
  return store.get('bounds') as Electron.Rectangle;
}

export function saveWindowState(window: BrowserWindow) {
  const bounds = window.getBounds();
  store.set('bounds', bounds);
}

// Usage in createWindow:
/*
  const bounds = restoreWindowState();
  const mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    ...otherOptions
  });

  mainWindow.on('resize', () => saveWindowState(mainWindow));
  mainWindow.on('move', () => saveWindowState(mainWindow));
*/
`;

export const windowStateTool = {
    name: "scaffold_window_state",
    description: "Generates code to save and restore window size/position using electron-store.",
    parameters: z.object({}),
    handler: async () => {
        return {
            content: [{
                type: "text" as const,
                text: WINDOW_STATE_CODE.trim()
            }]
        };
    }
};
