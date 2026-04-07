import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { FtpConfig } from './serverStore';
import { Message } from '../renderer/useTcpStore';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('imageAPI', {
  loadImage: (imageName: string, tempStoreMainImg: boolean, data: any) =>
    ipcRenderer.invoke('get-image-data', imageName, tempStoreMainImg, data),
});

contextBridge.exposeInMainWorld('electron', electronHandler);

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectSavePath: () => ipcRenderer.invoke('select-save-folder'),
  saveFile: (path: string, content: string) =>
    ipcRenderer.invoke('save-file', { path, content }),
});

contextBridge.exposeInMainWorld('APIs', {
  sendDataToApis: (message: Message) => {
    return ipcRenderer.invoke('send-data-to-APIs', { message });
  },
});

contextBridge.exposeInMainWorld('tcpIp', {
  // now returns { connectionId, status }
  connect: (host: string, port: number) => {
    return ipcRenderer.invoke('tcp-connect', { host, port });
  },

  // send data on an existing connection
  send: (connectionId: string, msg: string) => {
    return ipcRenderer.invoke('tcp-send', { connectionId, data: msg });
  },

  // close the connection
  disconnect: (connectionId: string) => {
    return ipcRenderer.invoke('tcp-disconnect', { connectionId });
  },

  // subscribe to tcp-data from main
  onData: (callback: any) => {
    const listener = (
      event: Electron.IpcRendererEvent,
      { connectionId, data }: { connectionId: string; data: any },
    ) => {
      callback(connectionId, data);
    };
    ipcRenderer.on('tcp-data', listener);
    // return an unsubscribe function if you like:
    return () => ipcRenderer.removeListener('tcp-data', listener);
  },
});

contextBridge.exposeInMainWorld('selectedHost', {
  getSelectedHost: () => {
    return ipcRenderer.invoke('get-selected-host');
  },
  setSelectedHost: (connectionId: string) => {
    return ipcRenderer.invoke('set-selected-host', connectionId);
  },
});

contextBridge.exposeInMainWorld('ftpAPI', {
  selectFolder: () => ipcRenderer.invoke('ftp-selectFolder'),

  startFtp: () => {
    return ipcRenderer.invoke('ftp-start');
  },
  stopFtp: () => {
    return ipcRenderer.invoke('ftp-stop');
  },

  getFtpConfig: () => {
    return ipcRenderer.invoke('ftp-get-config');
  },

  setFtpConfig: (config: FtpConfig) => {
    return ipcRenderer.invoke('ftp-update-config', config);
  },
  resetFtpConfig: () => {
    return ipcRenderer.invoke('ftp-reset-config');
  },

  onFtpConnected: (callback: (data: any) => void) => {
    ipcRenderer.on('ftp-connected', (_event, data) => {
      callback(data);
    });
  },
});

contextBridge.exposeInMainWorld('authAPI', {
  login: (payload: { id: number; hashedId: string }) =>
    ipcRenderer.invoke('auth-login', payload),
  getToken: () => ipcRenderer.invoke('get-auth-token'),
  setToken: (token: string) => ipcRenderer.invoke('set-auth-token', token),
  clearToken: () => ipcRenderer.invoke('clear-auth-token'),
  logout: () => ipcRenderer.invoke('auth-logout'),
});

contextBridge.exposeInMainWorld('inboundAPI', {
  startInbound: (inboundId: number, token: string) =>
    ipcRenderer.invoke('start-inbound', { inboundId, token }),
  setInboundId: (id: number) => ipcRenderer.invoke('set-inbound-id', id),
  getInboundId: () => ipcRenderer.invoke('get-inbound-id'),
  finishInbound: (id: number) => ipcRenderer.invoke('finish-inbound', id),
});

contextBridge.exposeInMainWorld('hostStore', {
  getHosts: () => {
    return ipcRenderer.invoke('get-hosts');
  },

  getRegime: () => {
    return ipcRenderer.invoke('get-regime');
  },

  removeRegime: (value: number) => {
    return ipcRenderer.invoke('remove-regime', value);
  },

  addRegime: (value: number) => {
    return ipcRenderer.invoke('add-regime', value);
  },

  addHost: (hostEntry: {
    id: string;
    name: string;
    host: string;
    port: string;
    auto: boolean;
  }) => {
    return ipcRenderer.invoke('add-host', hostEntry);
  },
  removeHost: (id: string) => {
    return ipcRenderer.invoke('remove-host', id);
  },
  removeAllHosts: () => {
    ipcRenderer.send('remove-all-hosts');
  },
});

export type ElectronHandler = typeof electronHandler;
