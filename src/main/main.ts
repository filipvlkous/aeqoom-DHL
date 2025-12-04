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

import FtpSrv from 'ftp-srv';
import { FtpConfig, HostEntry } from './serverStore/types';

import { ftpConfigService } from './serverStore/services/ftpService';
import { hostService } from './serverStore/services/hostService';
import { regimeService } from './serverStore';
import { safeParseJSON } from './utils/jsonParser';
import { processSvgAndReturnBase64 } from './utils/jsonFilter';
import { uploadBase64ToSupabase, uploadLog } from './API/supabaseAPI';
import { processBarcodesAlensa } from './API/wmsAPI';
import { Message } from '../renderer/useTcpStore';

import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('userData'), 'logs/main.log');
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

log.info('Application starting...');
// Type definitions for FTP server
interface FtpConnection {
  ip: string;
  socket: Socket;
}

interface FtpLoginData {
  connection: FtpConnection;
  username: string;
  password: string;
}

interface FtpLoginResponse {
  root: string;
  cwd?: string;
}

interface FtpServerEvents {
  login: (
    data: FtpLoginData,
    resolve: (response: FtpLoginResponse) => void,
    reject: (error: Error) => void,
  ) => void;
  'client-error': (data: {
    connection: FtpConnection;
    context: string;
    error: Error;
  }) => void;
  'uncaught-error': (error: Error) => void;
  STOR: (error: Error | null, filePath?: string) => void;
  RETR: (error: Error | null, filePath?: string) => void;
}

interface FtpServer {
  listen(): Promise<void>;
  close(): Promise<void>;
  on<K extends keyof FtpServerEvents>(
    event: K,
    listener: FtpServerEvents[K],
  ): void;
}

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
let tcpClient: Socket | null = null;
let tcpConnectionInfo: { host: string; port: number } | null = null;

let currentImage: { data: string | null; name: string | null } = {
  data: null,
  name: null,
};
let currentSvg: { data: string | null; name: string | null } = {
  data: null,
  name: null,
};

let mainWindow: BrowserWindow | null = null;
let ftpServer: FtpServer | null = null;

// FTP Server response types
interface FtpServerResponse {
  success: boolean;
  message: string;
}

interface FtpServerStatus {
  running: boolean;
  config: FtpConfig | null;
  message?: string;
}

interface FtpLogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: string;
}
let currentFtpConfig: FtpConfig;

let tempData: any;

// FTP Server management functions
function createFtpServer(config: FtpConfig): FtpServer {
  if (!config.rootPath) {
    throw new Error('Root path is not set');
  }

  const normalizedRootPath = path.resolve(config.rootPath);

  const server = new FtpSrv({
    url: `ftp://${config.host}:${config.port}`,
    anonymous: config.anonymous,
    pasv_url: config.pasvUrl,
    pasv_min: config.pasvMin,
    pasv_max: config.pasvMax,
    greeting: ['Welcome to Electron FTP Server', 'Created with ftp-srv'],
  }) as FtpServer;

  server.on(
    'login',
    (
      { connection, username, password }: FtpLoginData,
      resolve: (response: FtpLoginResponse) => void,
      reject: (error: Error) => void,
    ) => {
      if (config.anonymous && username === 'anonymous') {
        resolve({ root: normalizedRootPath });
      } else if (
        !config.anonymous &&
        username === config.username &&
        password === config.password
      ) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ftp-connected', { success: true });
        }
        resolve({ root: normalizedRootPath });
      } else {
        reject(new Error('Invalid credentials'));
      }
    },
  );

  // Rest of the event handlers remain the same...
  server.on(
    'client-error',
    ({
      connection,
      context,
      error,
    }: {
      connection: FtpConnection;
      context: string;
      error: Error;
    }) => {
      console.log('FTP Client error:', error.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ftp-connected', { success: false });
        mainWindow.webContents.send('ftp-log', {
          type: 'error',
          message: `Client error: ${error.message}`,
          timestamp: new Date().toISOString(),
        } as FtpLogEntry);
      }
    },
  );

  server.on('uncaught-error', (error: Error) => {
    console.log('FTP Uncaught error:', error.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ftp-log', {
        type: 'error',
        message: `Server error: ${error.message}`,
        timestamp: new Date().toISOString(),
      } as FtpLogEntry);
    }
  });

  // File system events
  server.on('STOR', (error: Error | null, filePath?: string) => {
    if (error) {
      console.log('File upload error:', error.message);
    } else if (filePath) {
      console.log('File uploaded successfully:', filePath);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ftp-log', {
          type: 'success',
          message: `File uploaded: ${path.basename(filePath)}`,
          timestamp: new Date().toISOString(),
        } as FtpLogEntry);
      }
    } else {
      console.log('STOR event with no error and no filePath');
    }
  });

  server.on('RETR', (error: Error | null, filePath?: string) => {
    if (error) {
      console.log('File download error:', error.message);
    } else if (filePath) {
      console.log('File downloaded:', filePath);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ftp-log', {
          type: 'info',
          message: `File downloaded: ${path.basename(filePath)}`,
          timestamp: new Date().toISOString(),
        } as FtpLogEntry);
      }
    }
  });

  return server;
}

function sendStatusToMainWindow(
  success: boolean,
  config: typeof currentFtpConfig | null,
  message: string,
): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const timestamp = new Date().toISOString();

    // Send status
    mainWindow.webContents.send('ftp-status', {
      running: success,
      config: config,
      message: message,
    } as FtpServerStatus);

    // Send log entry
    mainWindow.webContents.send('ftp-log', {
      type: success ? 'success' : 'error',
      message: message,
      timestamp: timestamp,
    } as FtpLogEntry);
  }
}

async function validateAndPrepareRootPath(rootPath: string): Promise<string> {
  if (!rootPath) {
    throw new Error('Root path is not set');
  }

  // Normalize and resolve the root path to prevent path concatenation issues
  const normalizedRootPath = path.resolve(rootPath);

  // Validate root path exists, create it if it doesn't
  if (!fs.existsSync(normalizedRootPath)) {
    fs.mkdirSync(normalizedRootPath, { recursive: true });
    log.info(`Created FTP root directory: ${normalizedRootPath}`);
  }

  // Verify the directory is accessible (Read and Write)
  try {
    fs.accessSync(normalizedRootPath, fs.constants.R_OK | fs.constants.W_OK);
    return normalizedRootPath;
  } catch (accessError) {
    const errorMsg = `Cannot access root directory: ${normalizedRootPath} - ${accessError}`;
    log.error(errorMsg);
    // Re-throw the error to be caught by the main function's catch block
    throw new Error(errorMsg);
  }
}

async function startFtpServer(): Promise<FtpServerResponse> {
  log.info('Starting FTP server...');

  try {
    if (ftpServer) {
      await stopFtpServer();
    }

    let storedConfig = await ftpConfigService.getFtpConfig();
    log.info('Stored config:', storedConfig);

    if (storedConfig && Object.keys(storedConfig).length > 0) {
      await ftpConfigService.updateFtpConfig(storedConfig);
    }

    // 4. Validate and prepare root path
    const normalizedRootPath = await validateAndPrepareRootPath(
      storedConfig.rootPath!,
    );

    const normalizedConfig = {
      ...storedConfig,
      rootPath: normalizedRootPath,
    };

    // 5. Create and start FTP server
    ftpServer = createFtpServer(normalizedConfig);
    currentFtpConfig = { ...normalizedConfig };

    await ftpServer.listen();

    const successMessage = `FTP Server started on ${normalizedConfig.host}:${normalizedConfig.port}`;
    log.info(successMessage);

    // 6. Send success status to UI
    sendStatusToMainWindow(true, currentFtpConfig, successMessage);

    return { success: true, message: 'FTP Server started successfully' };
  } catch (error) {
    // 7. Handle and log errors
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error occurred during server startup';
    log.error('Failed to start FTP server:', errorMessage);

    // 8. Send failure status to UI
    sendStatusToMainWindow(
      false,
      null,
      `Failed to start FTP Server: ${errorMessage}`,
    );

    return { success: false, message: errorMessage };
  }
}
async function stopFtpServer(): Promise<FtpServerResponse> {
  try {
    if (ftpServer) {
      await ftpServer.close();
      ftpServer = null;

      log.info('Shutting down FTP server...');

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ftp-status', {
          running: false,
          config: null,
          message: 'FTP Server stopped',
        } as FtpServerStatus);

        mainWindow.webContents.send('ftp-log', {
          type: 'info',
          message: 'FTP Server stopped',
          timestamp: new Date().toISOString(),
        } as FtpLogEntry);
      }

      log.info('FTP Server stopped successfully');

      return { success: true, message: 'FTP Server stopped successfully' };
    }
    log.info('FTP Server was not running');

    return { success: true, message: 'FTP Server was not running' };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to stop FTP server:', errorMessage);
    return { success: false, message: errorMessage };
  }
}

function getFtpServerStatus(): FtpServerStatus {
  return {
    running: ftpServer !== null,
    config: ftpServer ? currentFtpConfig : null,
  };
}
ipcMain.handle('ftp-start', async () => {
  try {
    await stopFtpServer();
    const result = await startFtpServer();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    log.error('IPC ftp-start failed:', error);

    return {
      success: false,
      message,
    };
  }
});

ipcMain.handle('ftp-set-connected', () => {
  return { success: true };
});

ipcMain.handle('ftp-stop', async (): Promise<FtpServerResponse> => {
  try {
    return await stopFtpServer();
  } catch (error: any) {
    log.error('IPC ftp-stop failed:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('ftp-selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }

  return null;
});

ipcMain.handle('ftp-status', (): FtpServerStatus => {
  return getFtpServerStatus();
});

ipcMain.handle('ftp-get-config', async (): Promise<FtpConfig> => {
  return await ftpConfigService.getFtpConfig();
});

ipcMain.handle(
  'ftp-set-config',
  async (
    _event: Electron.IpcMainInvokeEvent,
    config: FtpConfig,
  ): Promise<void> => {
    await ftpConfigService.setFtpConfig(config);
    currentFtpConfig = config; // Update local cache
  },
);

ipcMain.handle(
  'ftp-update-config',
  async (
    _event: Electron.IpcMainInvokeEvent,
    updates: Partial<FtpConfig>,
  ): Promise<void> => {
    log.info('update config', updates);
    const updatedConfig = await ftpConfigService.updateFtpConfig(updates);
    currentFtpConfig = updatedConfig; // Update local cache
    app.relaunch();
    app.exit();
    // return updatedConfig;
  },
);

ipcMain.handle('ftp-reset-config', async (): Promise<void> => {
  await ftpConfigService.resetFtpConfig();
  currentFtpConfig = await ftpConfigService.getFtpConfig(); // Reload from store
});

ipcMain.handle('ftp-select-root-folder', async (): Promise<string | null> => {
  if (!mainWindow) {
    throw new Error('"mainWindow" is not defined');
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select FTP Root Directory',
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return filePaths[0];
});

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
    // Stop FTP server when window closes
    if (ftpServer) {
      stopFtpServer();
    }
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
ipcMain.handle(
  'save-file',
  async (
    _e: Electron.IpcMainInvokeEvent,
    { path, content }: { path: string; content: string },
  ): Promise<void> => {
    fs.writeFileSync(path, content, 'utf-8');
  },
);

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
      cleanupTcpClient();
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

        client.on('data', (buffer: Buffer) => {
          const data = buffer.toString();
          const jsonData = safeParseJSON(data);

          if (jsonData && typeof jsonData === 'object' && 'codes' in jsonData) {
            tempData = jsonData.codes;
          }

          event.sender.send('tcp-data', { connectionId, data });
        });

        client.once('end', () => {
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
    log.info('Attempting to send data');

    if (!tcpClient) {
      log.error('No active TCP connection');
      throw new Error('Not connected to any server');
    }

    if (tcpClient.destroyed) {
      log.error('TCP connection is destroyed');
      cleanupTcpClient();
      throw new Error('Connection is closed');
    }

    if (!tcpClient.writable) {
      log.error('TCP connection is not writable');
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
      tcpClient!.write(message, 'utf8', (err) => {
        if (err) {
          log.error('Write error:', err);
          reject(err);
        } else {
          log.info('Data sent successfully');
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

ipcMain.handle('get-hosts', async (): Promise<HostEntry[]> => {
  const store = await hostService.getHosts();
  log.info('get-hosts', store);
  return store;
});

ipcMain.handle('get-regime', async (): Promise<any> => {
  const store = await regimeService.getRegime();
  log.info('get-regime', store);
  return store || [];
});

ipcMain.handle('get-selected-host', async (): Promise<any> => {
  const host = await hostService.getSelectedHost();
  log.info('get-selected-host', host);
  return host || null;
});

ipcMain.handle(
  'set-selected-host',
  async (event: Electron.IpcMainInvokeEvent, value: string): Promise<any> => {
    log.info('set-selected-host', value);
    await hostService.setSelectedHost(value);
  },
);

ipcMain.handle(
  'add-regime',
  async (event: Electron.IpcMainInvokeEvent, value: number): Promise<any> => {
    log.info('add-regime', value);
    await regimeService.addRegime(value);

    return await regimeService.getRegime();
  },
);

ipcMain.handle(
  'remove-regime',
  async (event: Electron.IpcMainInvokeEvent, value: number): Promise<any> => {
    log.info('remove-regime', value);
    await regimeService.removeRegime(value);
    return await regimeService.getRegime();
  },
);

ipcMain.handle(
  'add-host',
  async (
    event: Electron.IpcMainInvokeEvent,
    hostEntry: HostEntry,
  ): Promise<void> => {
    log.info('add-host', hostEntry);
    await hostService.addHost(hostEntry);
  },
);

ipcMain.handle(
  'remove-host',
  async (
    event: Electron.IpcMainInvokeEvent,
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const success = await hostService.removeHost(id);
    if (!success) {
      return { success: false, error: 'Host not found' };
    }
    log.info('Host removed successfully');
    const updatedHosts = await hostService.getHosts();

    // Ensure we're sending serializable data
    const serializedHosts = JSON.parse(JSON.stringify(updatedHosts));

    BrowserWindow.getAllWindows().forEach((win: BrowserWindow) => {
      if (!win.isDestroyed()) {
        // Safety check
        win.webContents.send('hosts-updated', serializedHosts);
      }
    });

    return { success: true };
  },
);

ipcMain.on('remove-all-hosts', async (): Promise<void> => {
  await hostService.removeAllHosts();
});

ipcMain.handle(
  'get-image-data',
  async (event, imageName, tempStoreMainImg, data?) => {
    console.log(imageName);
    if (!imageName) {
      return null;
    }

    if (data) {
      tempData = data;
    }

    const config = currentFtpConfig || (await ftpConfigService.getFtpConfig());
    const rootPath = config?.rootPath
      ? path.resolve(config.rootPath)
      : path.join(app.getAppPath(), 'ftp-root');

    const imagePath = path.join(rootPath, imageName);
    try {
      if (!fs.existsSync(imagePath)) {
        console.error(`Image not found at: ${imagePath}`);
        return null;
      }

      const stats = fs.statSync(imagePath);

      const fileExtension = path.extname(imageName).slice(1).toLowerCase();

      if (fileExtension === 'svg') {
        const fileData = processSvgAndReturnBase64(imagePath, tempData);

        tempData = null;

        if (tempStoreMainImg) {
          currentSvg.data = fileData;
          currentSvg.name = imageName;
        }
        return `data:image/svg+xml;base64,${fileData}`;
      }

      // Read file as buffer
      const fileBuffer = fs.readFileSync(imagePath);

      // If file is larger than 10MB, warn about potential issues
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(
          `Large file detected (${(stats.size / 1024 / 1024).toFixed(2)} MB). Consider using file:// protocol instead.`,
        );
      }

      const base64Data = fileBuffer.toString('base64');
      const mimeType =
        {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          bmp: 'image/bmp',
          gif: 'image/gif',
        }[fileExtension] || 'image/jpeg';

      if (tempStoreMainImg) {
        currentImage.data = base64Data;
        currentImage.name = imageName;
      }

      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error('Failed to read image file:', error);
      return null;
    }
  },
);

ipcMain.handle(
  'supabase-functions-dashboard',
  async (_event, { message }: { message: Message }) => {
    try {
      if (!currentImage.data || !currentSvg.data) {
        throw new Error('Image or SVG data is missing.');
      }

      const barcodes = message.content.map((item) => item.content);

      const [alensaResult, supabaseResult, imgUpload, svgUpload] =
        await Promise.all([
          processBarcodesAlensa(barcodes),
          uploadLog(message),
          uploadBase64ToSupabase(
            currentImage.data,
            'images',
            currentImage.name!,
            'image/jpg',
          ),
          uploadBase64ToSupabase(
            currentSvg.data,
            'svg',
            currentSvg.name!,
            'image/svg+xml',
          ),
        ]);

      return {
        success: true,
        alensa: alensaResult,
        supabase: supabaseResult,
        uploads: { img: imgUpload, svg: svgUpload },
      };
    } catch (error: any) {
      console.error('API Handling Error:', error);
      return {
        success: false,
        error: error.message || 'Unexpected error during API processing',
      };
    } finally {
      // 4. Cleanup: Always reset state to free up memory, success or fail
      currentImage = { data: null, name: null };
      currentSvg = { data: null, name: null };
    }
  },
);

ipcMain.handle(
  'send-data-to-APIs',
  async (_event, { message }: { message: Message }) => {
    try {
      if (!currentImage.data || !currentSvg.data) {
        throw new Error('Image or SVG data is missing.');
      }

      const barcodes = message.content.map((item) => item.content);

      const [alensaResult, supabaseResult, imgUpload, svgUpload] =
        await Promise.all([
          processBarcodesAlensa(barcodes),
          uploadLog(message),
          uploadBase64ToSupabase(
            currentImage.data,
            'images',
            currentImage.name!,
            'image/jpg',
          ),
          uploadBase64ToSupabase(
            currentSvg.data,
            'svg',
            currentSvg.name!,
            'image/svg+xml',
          ),
        ]);

      return {
        success: true,
        alensa: alensaResult,
        supabase: supabaseResult,
        uploads: { img: imgUpload, svg: svgUpload },
      };
    } catch (error: any) {
      console.error('API Handling Error:', error);
      return {
        success: false,
        error: error.message || 'Unexpected error during API processing',
      };
    } finally {
      // 4. Cleanup: Always reset state to free up memory, success or fail
      currentImage = { data: null, name: null };
      currentSvg = { data: null, name: null };
    }
  },
);

app.on('window-all-closed', () => {
  // Stop FTP server before quitting
  if (ftpServer) {
    stopFtpServer();
  }

  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
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

// Export types for use in other files
export type { FtpServerResponse, FtpServerStatus, FtpLogEntry };
