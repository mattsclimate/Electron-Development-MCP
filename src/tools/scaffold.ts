import { z } from "zod";

const PATTERNS: Record<string, string> = {
    "tray-icon": `
// In Main Process
import { Tray, Menu, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow) {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../../assets/icon.png'));
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setToolTip('My Application');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}
    `,
    "ipc-handler": `
// In Main Process (ipc.ts)
import { ipcMain } from 'electron';

export function setupIPC() {
  ipcMain.handle('my-channel', async (event, arg) => {
    // Perform work
    return { success: true, data: 'Result' };
  });
}

// In Preload (preload.ts)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  myChannel: (arg: string) => ipcRenderer.invoke('my-channel', arg)
});
    `,
    "auto-updater": `
// In Main Process
import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';

export function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version is available. It will be downloaded in the background.'
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Install and restart now?',
      buttons: ['Yes', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}
    `
};

export const boilerplateSmithTool = {
    name: "scaffold_electron_pattern",
    description: "Generates production-ready code templates for common Electron patterns (e.g., 'tray-icon', 'ipc-handler').",
    parameters: z.object({
        patternName: z.enum(["tray-icon", "ipc-handler", "auto-updater"]).describe("The name of the pattern to generate."),
    }),
    handler: async ({ patternName }: { patternName: string }) => {
        const code = PATTERNS[patternName as keyof typeof PATTERNS];

        if (!code) {
            return { content: [{ type: "text" as const, text: `Pattern '${patternName}' not found. Available: ${Object.keys(PATTERNS).join(", ")}` }] };
        }

        return {
            content: [{
                type: "text" as const,
                text: code.trim()
            }]
        };
    }
};
