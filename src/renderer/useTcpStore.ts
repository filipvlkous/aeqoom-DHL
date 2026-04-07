import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { safeParseJSON } from '../main/utils/jsonParser';

interface TcpConnection {
  id: string;
  remoteId?: string;
  name: string;
  host: string;
  port: number;
  status: string;
  lastConnected: string | null;
  messageCount: number;
  autoReconnect: boolean;
}

type Corners = {
  x: number;
  y: number;
};

type ContentBuild = {
  content: string;
  corners?: Corners[];
  added: boolean;
};

export interface Message {
  id: string;
  connectionId: string;
  type: string;
  content: ContentBuild[];
  createBox: boolean;
  receivedTime: string;
  regime: number | null;
  imageName: string | null;
  sendTime: string | null;
}

interface NewConnectionForm {
  name: string;
  host: string;
  port: string;
}

declare global {
  interface Window {
    hostStore: {
      getHosts: () => Promise<
        { id: string; name: string; host: string; port: string }[]
      >;
      getRegime: () => Promise<number[]>;
      addHost: (hostEntry: {
        id: string;
        name: string;
        host: string;
        port: string;
        auto: boolean;
      }) => Promise<void>;
      removeHost: (id: string) => Promise<boolean>;
      removeAllHosts: () => void;
      addRegime: (value: number) => Promise<number[]>;
      removeRegime: (value: number) => Promise<number[]>;
    };
    selectedHost: {
      getSelectedHost: () => Promise<string>;
      setSelectedHost: (host: string) => Promise<void>;
    };
  }
}

// Zustand Store
interface TcpStore {
  // State
  messageBuffers: Map<string, string>; // Buffer for each connection
  connections: TcpConnection[];
  ftpConnected: boolean;
  messages: Message[];
  activeConnection: string | null;
  bridgeReady: boolean;
  currentView: 'connections' | 'messages' | 'activity';
  regime: number | null;
  totalPhotos: number;
  svgImage: string | null;
  image: string | null;
  cameraBtnDisabled: boolean;
  inboundId: number | null;
  setInboundId: (id: number | null) => void;
  createBox: boolean;
  setCreateBox: (value: boolean) => void;
  // Actions
  updateConnection: (id: string, updates: Partial<TcpConnection>) => void;
  addConnection: (form: NewConnectionForm) => Promise<void>;
  removeConnection: (id: string) => void;
  removeAllConnections: () => void;

  setImage: (
    image: string | null,
    tempStoreMainImg: boolean,
    data?: any,
  ) => void;

  setMessages: (messages: Message[]) => void;
  addMessage: (connId: string, type: Message['type'], content: string) => void;

  setActiveConnection: (id: string | null) => void;
  setBridgeReady: (ready: boolean) => void;

  connectToServer: (id: string) => Promise<void>;
  disconnectFromServer: (id: string) => void;
  connectAll: () => void;
  disconnectAll: () => void;

  sendMessage: (message: string) => void;
  sendDataMessage: () => Message | undefined;
  initializeConnections: () => Promise<void>;
  initializeDataListener: () => (() => void) | undefined;
  initFtpListener: () => void;

  setRegime: (regime: number) => void;

  addRegime: (value: number) => Promise<void>;
  removeRegime: (value: number) => Promise<void>;
  addContend: (value: string, increment: number) => void;
  updateContend: (value: boolean) => void;

  setCameraBtnDisabled: (value: boolean) => void;
  resetState: () => void;
}

const useTcpStore = create<TcpStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    connections: [],
    messages: [],
    ftpConnected: false,
    activeConnection: null,
    bridgeReady: false,
    currentView: 'connections',
    regime: null,
    openAddModal: false,
    totalPhotos: 0,
    svgImage: null,
    image: null,
    messageBuffers: new Map(),
    cameraBtnDisabled: false,
    inboundId: null,
    createBox: false,

    setInboundId: (id: number | null) => set({ inboundId: id }),
    setCreateBox: (value: boolean) => set({ createBox: value }),

    resetState: () => {
      set({
        image: null,
        svgImage: null,
        cameraBtnDisabled: false,
        totalPhotos: 0,
        messages: [],
        createBox: false,
        inboundId: null,
      });
    },
    updateConnection: (id, updates) =>
      set((state) => ({
        connections: state.connections.map((conn) =>
          conn.id === id ? { ...conn, ...updates } : conn,
        ),
      })),

    setCameraBtnDisabled: (value: boolean) => {
      set({ cameraBtnDisabled: value });
    },

    setFtpConnected: async (value: boolean) => {
      const val = await window.ftpAPI.onFtpConnected(value);
      console.log('Ftp connected (manual set):', val);
      set({ ftpConnected: value });
    },

    initFtpListener: () => {
      window.ftpAPI.onFtpConnected((data: any) => {
        set({ ftpConnected: data.success });
      });
    },

    addConnection: async (form) => {
      const { connections, activeConnection } = get();
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 9);

      if (!form.name || !form.host || !form.port) return;

      const conn: TcpConnection = {
        id,
        name: form.name,
        host: form.host,
        port: parseInt(form.port, 10),
        status: 'disconnected',
        lastConnected: null,
        messageCount: 0,
        autoReconnect: true,
      };

      try {
        await window.hostStore?.addHost({
          id,
          name: form.name,
          host: form.host,
          port: form.port,
          auto: true,
        });

        set({
          connections: [...connections, conn],
          activeConnection: !activeConnection ? conn.id : activeConnection,
        });
      } catch (error) {
        console.error('Failed to add connection:', error);
      }
    },

    setImage: async (image, tempStoreMainImg, data) => {
      if (image) {
        const [imageDataUri, svgData] = await Promise.all([
          window.imageAPI.loadImage(image + '.jpg', tempStoreMainImg),
          window.imageAPI.loadImage(image + '.svg', tempStoreMainImg, data),
        ]);

        set({ image: imageDataUri, svgImage: svgData });
        set({ cameraBtnDisabled: false });
      } else {
        set({ image: null, svgImage: null, cameraBtnDisabled: false });
      }
    },

    removeConnection: (id) => {
      const { connections, activeConnection, disconnectFromServer } = get();

      // Disconnect first
      disconnectFromServer(id);

      // Remove from storage
      window.hostStore?.removeHost(id);

      // Update state
      const newConnections = connections.filter((c) => c.id !== id);
      set({
        connections: newConnections,
        messages: get().messages.filter((m) => m.connectionId !== id),
        activeConnection:
          activeConnection === id
            ? newConnections.length > 0
              ? newConnections[0].id
              : null
            : activeConnection,
      });
    },

    removeAllConnections: () => {
      const { disconnectAll } = get();
      disconnectAll();
      window.hostStore?.removeAllHosts();
      set({
        connections: [],
        messages: [],
        activeConnection: null,
      });
    },

    setMessages: (messages) => set({ messages }),

    addContend: (value: string, inc: number) => {
      set((state) => {
        if (!Array.isArray(state.messages) || state.messages.length === 0) {
          return {};
        }

        const updatedMessages = [...state.messages];
        const lastIndex = updatedMessages.length - 1;
        const lastMessage = updatedMessages[lastIndex];

        // This check is now actually useful
        if (!lastMessage) {
          return {};
        }

        const currentContent = Array.isArray(lastMessage.content)
          ? lastMessage.content
          : [];

        // Create a ContentBuild object from the string value
        const newContent: ContentBuild = {
          content: value,
          corners: undefined,
          added: true,
        };

        let arr = [];

        let i = 0;
        while (i < inc) {
          arr.push(newContent);
          i++;
        }

        updatedMessages[lastIndex] = {
          ...lastMessage,
          content: [...currentContent, ...arr],
        };

        return { messages: updatedMessages };
      });
    },

    updateContend: (value: boolean) => {
      set((state) => {
        if (!Array.isArray(state.messages) || state.messages.length === 0) {
          return {};
        }

        const updatedMessages = [...state.messages];
        const lastIndex = updatedMessages.length - 1;
        const lastMessage = updatedMessages[lastIndex];

        // This check is now actually useful
        if (!lastMessage) {
          return {};
        }

        updatedMessages[lastIndex] = {
          ...lastMessage,
          type: value ? 'OK' : 'NOK',
        };

        return { messages: updatedMessages };
      });
    },

    addMessage: async (connId, type, content: any) => {
      try {
        const json = await safeParseJSON(content);
        let imageName: string | null = null;
        if (json.image) {
          const total = json.image.index;
          const time = json.image.creationTime;

          imageName = json.image.name + '-' + total + '-' + time;
          setTimeout(() => {
            get().setImage(imageName, true);
          }, 1000);
        }

        const jj = Array.isArray(json?.codes)
          ? json.codes.map((group: ContentBuild) => ({
              content: group.content,
              corners: group.corners,
              added: false,
            }))
          : [];

        const message: Message = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
          connectionId: connId,
          type,
          content: jj,
          receivedTime: new Date().toISOString(),
          imageName: imageName,
          regime: get().regime,
          createBox: get().createBox,
          sendTime: null,
        };

        set((state) => {
          let updated = [...state.messages, message];

          state.totalPhotos = state.totalPhotos + 1;
          // keep only last 10
          if (updated.length > 10) {
            updated = updated.slice(updated.length - 10);
          }

          return { messages: updated };
        });
      } catch (error) {
        console.error('Failed to parse message content as JSON:', error);
        get().sendMessage('||>trigger on\r\n');
      }
    },

    sendDataMessage: (): Message | undefined => {
      const state = get(); // use get() instead of set() callback for current state

      if (!Array.isArray(state.messages) || state.messages.length === 0) return;

      const updatedMessages = [...state.messages];
      const lastIndex = updatedMessages.length - 1;
      const lastMessage = updatedMessages[lastIndex];

      if (!lastMessage) return;

      updatedMessages[lastIndex] = {
        ...lastMessage,
        sendTime: new Date().toISOString(),
      };

      set({ messages: updatedMessages });

      return updatedMessages[lastIndex];
    },

    setActiveConnection: async (id) => {
      if (!id) return;
      await window.selectedHost.setSelectedHost(id);
      set({ activeConnection: id });
    },
    setBridgeReady: (ready) => set({ bridgeReady: ready }),

    connectToServer: async (id) => {
      get().disconnectAll();
      const { connections, updateConnection } = get();
      const conn = connections.find((c) => c.id === id);

      if (!conn || !window.tcpIp) return;

      updateConnection(id, { status: 'connecting' });

      try {
        const { connectionId: remoteId, status } = await window.tcpIp.connect(
          conn.host,
          conn.port,
        );

        updateConnection(id, {
          remoteId,
          status: status as any,
          lastConnected:
            status === 'connected'
              ? new Date().toISOString()
              : conn.lastConnected,
        });
      } catch (err: any) {
        updateConnection(id, { status: 'error' });
      }
    },

    disconnectFromServer: (id) => {
      const { connections, updateConnection } = get();
      const conn = connections.find((c) => c.id === id);

      if (!conn?.remoteId || !window.tcpIp) return;

      window.tcpIp.disconnect(conn.remoteId);
      updateConnection(id, { status: 'disconnected' });
    },

    connectAll: () => {
      const { connections, connectToServer } = get();
      connections.forEach((conn) => {
        if (conn.status === 'disconnected' && conn.autoReconnect) {
          connectToServer(conn.id);
        }
      });
    },

    disconnectAll: () => {
      const { connections, disconnectFromServer } = get();
      connections.forEach((conn) => {
        if (conn.status === 'connected' && conn.remoteId) {
          disconnectFromServer(conn.id);
        }
      });
    },

    sendMessage: (messageText) => {
      const { connections } = get();

      const conn = connections.find((c) => c.status === 'connected');
      if (
        !conn ||
        conn.status !== 'connected' ||
        !conn.remoteId ||
        !window.tcpIp
      )
        return;

      window.tcpIp.send(conn.remoteId, messageText.trim());
    },

    setRegime: (regime: number) => set({ regime }),

    initializeConnections: async () => {
      try {
        const hosts = (await window.hostStore?.getHosts()) || [];
        const initialConnections = hosts.map((h) => ({
          id: h.id,
          name: h.name,
          host: h.host,
          port: parseInt(h.port, 10),
          status: 'disconnected',
          lastConnected: null,
          messageCount: 0,
          autoReconnect: true,
        }));
        set({ connections: initialConnections });
        set({ activeConnection: await window.selectedHost.getSelectedHost() });
        if (get().activeConnection) {
          get().connectToServer(await window.selectedHost.getSelectedHost());
        }
      } catch (error) {
        console.error('Failed to initialize connections:', error);
      }
    },

    addRegime: async (value) => {
      try {
        const updatedRegime = await window.hostStore?.addRegime(value);
        if (updatedRegime) {
          console.log('Regime after addition:', updatedRegime);
        }
      } catch (error) {
        console.error('Failed to add regime value:', error);
      }
    },

    removeRegime: async (value) => {
      try {
        const updatedRegime = await window.hostStore?.removeRegime(value);
        if (updatedRegime) {
          console.log('Regime after removal:', updatedRegime);
        }
      } catch (error) {
        console.error('Failed to remove regime value:', error);
      }
    },

    initializeDataListener: () => {
      if (!window.tcpIp) return;

      const unsubscribe = window.tcpIp.onData((remoteId, data) => {
        const local = get().connections.find((c) => c.remoteId === remoteId);
        if (!local) return;

        if (data === '__disconnected__') {
          get().updateConnection(local.id, { status: 'disconnected' });
        } else {
          get().addMessage(local.id, 'received', data);
          get().updateConnection(local.id, {
            messageCount:
              (get().connections.find((c) => c.id === local.id)?.messageCount ||
                0) + 1,
          });
        }
      });

      return unsubscribe;
    },
  })),
);

export default useTcpStore;
