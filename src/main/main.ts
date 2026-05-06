/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog, protocol } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import * as fs from 'fs';
import { createConnection, Socket } from 'net';
const { v4: uuidv4 } = require('uuid');

import {
  HostEntry,
  BarcodeMask,
  PartSummary,
  Scan,
  Setup,
  SetupCamera,
} from './serverStore/types';

import { storeService } from './serverStore';
import { databaseService } from './serverStore/services/databaseService';
import { safeParseJSON } from './utils/jsonParser';
import { Message } from '../renderer/useTcpStore';

import dotenv from 'dotenv';
import { cleanupUtil } from './utils/clearData';
import { Rss } from 'lucide-react';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('userData'), 'logs/main.log');
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

log.info('Application starting...');





class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
let tcpClient: Socket | null = null;
let tcpConnectionInfo: { host: string; port: number } | null = null;

let mainWindow: BrowserWindow | null = null;
let tempData: any;


// Existing IPC handlers with proper typing
ipcMain.on('ipc-example', async (event: Electron.IpcMainEvent, arg: any) => {
  const msgTemplate = (pingPong: string): string => `IPC test: ${pingPong}`;
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug: boolean =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async (): Promise<any> => {
  const installer = require('electron-devtools-installer');
  const forceDownload: boolean = !!process.env.UPGRADE_EXTENSIONS;
  const extensions: string[] = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name: string) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async (): Promise<void> => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH: string = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1924,
    height: 1080,
    fullscreen: false,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      log.error('"mainWindow" is not defined');
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    log.info('Main window closed');
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Handle file open
  ipcMain.handle(
    'select-file',
    async (): Promise<{ path: string; content: string } | null> => {
      if (!mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
      });
      if (canceled) return null;
      const file = fs.readFileSync(filePaths[0], 'utf-8');
      return { path: filePaths[0], content: file };
    },
  );

  // Handle save destination
  ipcMain.handle('select-save-folder', async (): Promise<string | null> => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save File As',
      defaultPath: 'output.txt',
    });
    return filePath || null;
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

// Handle file write


const clients = new Map<string, Socket>();

function cleanupClient(id: string): void {
  const sock = clients.get(id);
  if (!sock) return;
  sock.removeAllListeners();
  sock.destroy();
  clients.delete(id);
}

function cleanupTcpClient(): void {
  if (tcpClient) {
    tcpClient.removeAllListeners();
    tcpClient.destroy();
    tcpClient = null;
    tcpConnectionInfo = null;
  }
}
// Handle new connections
ipcMain.handle(
  'tcp-connect',
  async (
    event: Electron.IpcMainInvokeEvent,
    { host, port }: { host: string; port: number },
  ): Promise<{ connectionId: string; status: string }> => {
    if (tcpClient) {
      log.info('Closing existing connection before creating new one');
      // cleanupTcpClient();
    }
    const connectionId: string = uuidv4();
    return new Promise<{ connectionId: string; status: string }>(
      (resolve, reject) => {
        const client = createConnection({ host, port }, () => {
          clients.set(connectionId, client);
          log.log(`Connected to ${host}:${port} with ID ${connectionId}`);
          client.setEncoding('utf8');

          tcpClient = client;
          tcpConnectionInfo = { host, port };

          client.setEncoding('utf8');
          resolve({ connectionId, status: 'connected' });
        });
        client.once('error', (err: Error) => {
          log.error('Connection error:', err);
          cleanupClient(connectionId);
          reject(err);
        });

        client.on('data', async (buffer: Buffer) => {
          const data = buffer.toString();
          const jsonData = await safeParseJSON(data);

          if (jsonData && typeof jsonData === 'object' && 'codes' in jsonData) {
            tempData = jsonData.codes;
          }

          event.sender.send('tcp-data', { connectionId, data });
        });

        client.on('end', () => {
          log.log(`Disconnected from ${host}:${port} with ID ${connectionId}`);
          event.sender.send('tcp-data', {
            connectionId,
            data: '__disconnected__',
          });
          cleanupClient(connectionId);
        });
      },
    );
  },
);

ipcMain.handle(
  'tcp-send',
  async (
    _event: Electron.IpcMainInvokeEvent,
    { connectionId, data }: { connectionId: string; data: string },
  ): Promise<void> => {
    log.info(`Attempting to send data to connection ${connectionId}`);

    const client = clients.get(connectionId);

    if (!client) {
      log.error(`No TCP connection found for ID ${connectionId}`);
      throw new Error(`Not connected to server (ID: ${connectionId})`);
    }

    if (client.destroyed) {
      log.error(`TCP connection ${connectionId} is destroyed`);
      cleanupClient(connectionId);
      throw new Error('Connection is closed');
    }

    if (!client.writable) {
      log.error(`TCP connection ${connectionId} is not writable`);
      throw new Error('Connection is not writable');
    }

    // Ensure CRLF line ending
    let message = data;
    if (!message.endsWith('\r\n')) {
      if (message.endsWith('\n')) {
        message = message.slice(0, -1) + '\r\n';
      } else {
        message = message + '\r\n';
      }
    }

    return new Promise((resolve, reject) => {
      client.write(message, 'utf8', (err) => {
        if (err) {
          log.error(`Write error on ${connectionId}:`, err);
          reject(err);
        } else {
          log.info(`Data sent successfully to ${connectionId}`);
          resolve();
        }
      });
    });
  },
);

// Disconnect a specific connection
ipcMain.handle(
  'tcp-disconnect',
  (
    _event: Electron.IpcMainInvokeEvent,
    { connectionId }: { connectionId: string },
  ): void => {
    const client = clients.get(connectionId);
    if (client) {
      client.end();
      cleanupClient(connectionId);
    }
  },
);



ipcMain.handle(
  'send-data-to-APIs',
  async (_event, { message }: { message: Message }) => {
    try {
      const barcodes = message.content.map((item) => item.content);

      // processBarcodesAlensa(barcodes, createBox),

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('API Handling Error:', error);
      return {
        success: false,
        error: error.message || 'Unexpected error during API processing',
      };
    } finally {
    }
  },
);


ipcMain.handle('get-auth-token', async (): Promise<string> => {
  return await storeService.get('authToken') || '';
});

ipcMain.handle(
  'set-auth-token',
  async (_event: Electron.IpcMainInvokeEvent, token: string): Promise<void> => {
    await storeService.set('authToken', token);
  },
);

ipcMain.handle('clear-auth-token', async (): Promise<void> => {
  await storeService.set('authToken', '');
});

ipcMain.handle(
  'set-app-mode',
  async (_event: Electron.IpcMainInvokeEvent, mode: string): Promise<void> => {
    await storeService.set('appMode', mode);
  },
);

ipcMain.handle('get-app-mode', async (): Promise<string> => {
  return (await storeService.get('appMode')) || '';
});

ipcMain.handle(
  'set-workplace',
  async (
    _event: Electron.IpcMainInvokeEvent,
    workplaceId: string,
  ): Promise<void> => {
    await storeService.set('selectedWorkplace', workplaceId);
  },
);

ipcMain.handle('get-workplace', async (): Promise<string> => {
  return (await storeService.get('selectedWorkplace')) || '';
});

// ipcMain.handle('auth-logout', async (): Promise<{ success: boolean; error: string | null }> => {
//   return logoutAlensa();
// });



// ── Barcode Mask DB IPC handlers ──────────────────────────────

ipcMain.handle('db-get-barcode-masks', () => {
  return databaseService.getBarcodeMasks();
});

ipcMain.handle('db-get-barcode-mask', (_event: Electron.IpcMainInvokeEvent, id: string) => {
  return databaseService.getBarcodeMaskById(id);
});

ipcMain.handle('db-add-barcode-mask', (_event: Electron.IpcMainInvokeEvent, mask: BarcodeMask) => {
  return databaseService.addBarcodeMask(mask);
});

ipcMain.handle('db-remove-barcode-mask', (_event: Electron.IpcMainInvokeEvent, id: string) => {
  return databaseService.removeBarcodeMask(id);
});

ipcMain.handle('db-clear-barcode-masks', () => {
  return databaseService.clearBarcodeMasks();
});

// ── Part Summary DB IPC handlers ──────────────────────────────

ipcMain.handle('db-get-part-summaries', () => {
  return databaseService.getPartSummaries();
});

ipcMain.handle('db-get-part-summary', (_event: Electron.IpcMainInvokeEvent, id: string) => {
  return databaseService.getPartSummaryById(id);
});

ipcMain.handle(
  'db-add-part-summary',
  async (
    _event: Electron.IpcMainInvokeEvent,
    { part, scans }: { part: PartSummary; scans: Scan[] },
  ) => {
    const id = await databaseService.addPartSummary(part);
    for (const s of scans) {
      await databaseService.addScan({
        ...s,
        part_summary_id: id,
      });
    }
  },
);

ipcMain.handle(
  'db-remove-part-summary',
  (_event: Electron.IpcMainInvokeEvent, id: string) => {
    return databaseService.removePartSummary(id);
  },
);

ipcMain.handle('db-clear-part-summaries', () => {
  return databaseService.clearPartSummaries();
});

// ── Scans DB IPC handlers ─────────────────────────────────────

ipcMain.handle('db-get-scans', () => {
  return databaseService.getScans();
});

ipcMain.handle(
  'db-get-scans-by-part-summary',
  (_event: Electron.IpcMainInvokeEvent, partSummaryId: string) => {
    return databaseService.getScansByPartSummaryId(partSummaryId);
  },
);

ipcMain.handle(
  'db-get-scan',
  (_event: Electron.IpcMainInvokeEvent, id: string) => {
    return databaseService.getScanById(id);
  },
);

ipcMain.handle(
  'db-add-scan',
  (_event: Electron.IpcMainInvokeEvent, scan: Scan) => {
    return databaseService.addScan(scan);
  },
);

ipcMain.handle(
  'db-remove-scan',
  (_event: Electron.IpcMainInvokeEvent, id: string) => {
    return databaseService.removeScan(id);
  },
);

ipcMain.handle('db-clear-scans', () => {
  return databaseService.clearScans();
});

// ── Setup IPC handlers ────────────────────────────────────────

ipcMain.handle('db-get-setup', () => {
  return databaseService.getSetup();
});

ipcMain.handle(
  'db-upsert-setup',
  (_event: Electron.IpcMainInvokeEvent, s: Setup) => {
    return databaseService.upsertSetup(s);
  },
);

// ── Setup Camera IPC handlers ─────────────────────────────────

ipcMain.handle(
  'db-get-setup-cameras',
  async (_event: Electron.IpcMainInvokeEvent) => {
    return databaseService.getSetupCameras(
      await storeService.get('selectedWorkplace'),
    );
  },
);

ipcMain.handle(
  'db-get-setup-camera',
  (_event: Electron.IpcMainInvokeEvent, id: string) => {
    return databaseService.getSetupCameraById(id);
  },
);

ipcMain.handle(
  'db-add-setup-camera',
  (_event: Electron.IpcMainInvokeEvent, camera: SetupCamera) => {
    return databaseService.addSetupCamera(camera);
  },
);

ipcMain.handle(
  'db-remove-setup-camera',
  (_event: Electron.IpcMainInvokeEvent, id: string) => {
    return databaseService.removeSetupCamera(id);
  },
);

app.on('window-all-closed', () => {
  // Close PostgreSQL connection
  databaseService.close().catch(log.error);

  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    await databaseService.init();
  })
  .then(() => {
    cleanupUtil.scheduleDailyCleanup();
  })
  .then(() => {
    protocol.registerFileProtocol('local-file', (request, callback) => {
      // Get the path from the URL, e.g., 'ftp-root/DM3816-A8EEF0-70.bmp'
      const url = request.url.replace('local-file://', '');

      // Construct the correct absolute path.
      // path.join(__dirname, '..', url) moves up one directory from
      // the 'src' folder to the project root, then appends 'ftp-root/DM3816-A8EEF0-70.bmp'.
      const filePath = path.join(__dirname, '..', url);

      callback({ path: filePath });
    });
    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

