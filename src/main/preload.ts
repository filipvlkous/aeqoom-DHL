import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
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

contextBridge.exposeInMainWorld('electron', electronHandler);

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

contextBridge.exposeInMainWorld('workplaceStore', {
  setSelectedWorkplace: (workplaceId: string) => {
    return ipcRenderer.invoke('set-workplace', workplaceId);
  },
  getSelectedWorkplace: () => {
    return ipcRenderer.invoke('get-workplace');
  },
});

contextBridge.exposeInMainWorld('authAPI', {
  login: (payload: { id: number; hashedId: string }) =>
    ipcRenderer.invoke('auth-login', payload),
  getToken: () => ipcRenderer.invoke('get-auth-token'),
  setToken: (token: string) => ipcRenderer.invoke('set-auth-token', token),
  clearToken: () => ipcRenderer.invoke('clear-auth-token'),
  logout: () => ipcRenderer.invoke('auth-logout'),
  setAppMode: (mode: string) => ipcRenderer.invoke('set-app-mode', mode),
  getAppMode: () => ipcRenderer.invoke('get-app-mode'),
});


contextBridge.exposeInMainWorld('hostStore', {
  getHosts: () => {
    return ipcRenderer.invoke('get-hosts');
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

contextBridge.exposeInMainWorld('dbAPI', {
  getSetupCameras: () => ipcRenderer.invoke('db-get-setup-cameras'),
  addSetupCamera: (camera: {
    id: string;
    workplace_id: string;
    master_camera_ip: string | null;
    camera_port: number | null;
  }) => ipcRenderer.invoke('db-add-setup-camera', camera),
  getSetup: () => ipcRenderer.invoke('db-get-setup'),
  upsertSetup: (s: object) => ipcRenderer.invoke('db-upsert-setup', s),
  removeCamera: (id: string) =>
    ipcRenderer.invoke('db-remove-setup-camera', id),

  // Barcode Masks
  getBarcodeMasks: () => ipcRenderer.invoke('db-get-barcode-masks'),
  getBarcodeMask: (id: string) => ipcRenderer.invoke('db-get-barcode-mask', id),
  addBarcodeMask: (mask: object) =>
    ipcRenderer.invoke('db-add-barcode-mask', mask),
  removeBarcodeMask: (id: string) =>
    ipcRenderer.invoke('db-remove-barcode-mask', id),
  clearBarcodeMasks: () => ipcRenderer.invoke('db-clear-barcode-masks'),

  addPartSummary: (
    part: {
      id: string;
      created: Date;
      user_id: string | null;
      lpn: string;
      ean: string;
      sn_count: number;
      status: string | null;
    },
    scans: {
      id: string;
      created: Date;
      part_summary_id: string;
      user_id: string | null;
      barcode_type: string;
      barcode_value: string;
    }[],
  ) =>
    ipcRenderer.invoke('db-add-part-summary', {
      part,
      scans,
    }),
});

export type ElectronHandler = typeof electronHandler;
