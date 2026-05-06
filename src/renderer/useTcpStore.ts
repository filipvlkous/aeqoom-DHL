import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { safeParseJSON } from '../main/utils/jsonParser';
import {
  ClassifiedCode,
  classifyCodes,
  ScanValidationResult,
  validateHeight,
  validateScan,
  DbMask,
  BarcodeType,
  parseMaskPattern,
} from '../main/utils/barcodeValidator';

interface TcpConnection {
  id: string;
  remoteId?: string;
  host: string;
  port: number;
  status: string;
  workplace_id: string;
  lastConnected: string | null;
  messageCount: number;
  autoReconnect: boolean;
  camera_id: string;
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
  validation?: ScanValidationResult;
  receivedTime: string;
  sendTime: string | null;
  lpn?: string;
  ean?: string;
  serialNumbers?: string[];
}

export interface NewConnectionForm {
  host: string;
  port: string;
  workplace_id: string;
  camera_id: string;
}

declare global {
  interface Window {
    dbAPI: {
      getSetupCameras: () => Promise<
        {
          id: string;
          workplace_id: string;
          master_camera_ip: string | null;
          camera_port: number | null;
          camera_id: string;
        }[]
      >;
      addSetupCamera: (camera: {
        id: string;
        workplace_id: string;
        master_camera_ip: string | null;
        camera_port: number | null;
        camera_id: string;
      }) => Promise<void>;
      getSetup: () => Promise<{
        id: string;
        height_from: number;
        height_to: number;
        scan_duration_s: number | null;
        [key: string]: any;
      } | null>;
      upsertSetup: (s: object) => Promise<void>;
      removeCamera: (id: string) => Promise<void>;
      getBarcodeMasks: () => Promise<
        {
          id: string;
          barcode_type: string;
          barcode_mask: string;
          descr: string | null;
        }[]
      >;
      getBarcodeMask: (id: string) => Promise<{
        id: string;
        barcode_type: string;
        barcode_mask: string;
        descr: string | null;
      } | null>;
      addBarcodeMask: (mask: {
        id: string;
        barcode_type: string;
        barcode_mask: string;
        descr: string | null;
      }) => Promise<void>;
      removeBarcodeMask: (id: string) => Promise<boolean>;
      clearBarcodeMasks: () => Promise<void>;
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
      ) => Promise<void>;
    };
    hostStore: {
      getHosts: () => Promise<
        { id: string; name: string; host: string; port: string }[]
      >;
      addHost: (hostEntry: {
        id: string;
        name: string;
        host: string;
        port: string;
        workplace_id: string;
        auto: boolean;
      }) => Promise<void>;
      removeHost: (id: string) => Promise<boolean>;
      removeAllHosts: () => void;
    };
  }
}

interface ScanSetup {
  heightFrom: number;
  heightTo: number;
  // When > 0, ERR-05 is enforced. Set to null if WMS hasn't provided count yet.
  expectedSnCount: number | null;
  // Current measured height in cm; updated externally (e.g. from sensor data)
  currentHeightCm: number | null;
  // Seconds to buffer incoming messages before processing them as one scan
  scanDurationS: number | null;

  ean: string | null;
  snCount: number | null;
}

// Zustand Store
interface TcpStore {
  // State
  messageBuffers: Map<string, string>; // Buffer for each connection
  connections: TcpConnection[];
  messages: Message[];
  bridgeReady: boolean;
  currentView: 'connections' | 'messages' | 'activity';
  cameraBtnDisabled: boolean;
  isListening: boolean;
  scanSetup: ScanSetup;
  snMasks: DbMask[];
  updateScanSetup: (updates: Partial<ScanSetup>) => void;
  reloadMasks: () => Promise<void>;
  reloadSetup: () => Promise<void>;

  // Actions
  updateConnection: (id: string, updates: Partial<TcpConnection>) => void;
  addConnection: (form: NewConnectionForm) => Promise<void>;
  removeConnection: (id: string) => void;
  removeAllConnections: () => void;

  setMessages: (messages: Message[]) => void;
  addMessage: (connId: string, type: Message['type'], content: string) => void;
  _processCollectedCodes: (
    connId: string,
    type: string,
    codes: {
      content: string;
      corners?: { x: number; y: number }[];
      added: boolean;
    }[],
  ) => Promise<void>;

  setBridgeReady: (ready: boolean) => void;

  connectToServer: (id: string) => Promise<void>;
  disconnectFromServer: (id: string) => void;
  connectAll: () => void;
  disconnectAll: () => void;

  sendMessage: (message: string) => void;
  sendDataMessage: () => Message | undefined;
  initializeConnections: () => Promise<void>;
  initializeDataListener: () => (() => void) | undefined;

  addContend: (value: string, increment: number) => void;
  updateContend: (value: boolean) => void;

  setCameraBtnDisabled: (value: boolean) => void;
  setListening: (value: boolean) => void;
  resetState: () => void;
}

const DEFAULT_SCAN_SETUP: ScanSetup = {
  heightFrom: 50,
  heightTo: 250,
  expectedSnCount: null,
  currentHeightCm: null,
  scanDurationS: null,
  ean: null,
  snCount: null,
};

// Scan buffer – lives outside Zustand to avoid triggering re-renders
let scanBufferMap = new Map<string, { content: string; corners?: { x: number; y: number }[]; added: boolean; count: number }>();
let scanBufferConnId: string | null = null;
let scanBufferTimer: ReturnType<typeof setTimeout> | null = null;

const useTcpStore = create<TcpStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    connections: [],
    messages: [],
    bridgeReady: false,
    currentView: 'connections',
    messageBuffers: new Map(),
    cameraBtnDisabled: false,
    isListening: false,
    scanSetup: DEFAULT_SCAN_SETUP,
    snMasks: [],

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    updateScanSetup: (updates) =>
      set((state) => ({ scanSetup: { ...state.scanSetup, ...updates } })),

    reloadSetup: async () => {
      const setup = await window.dbAPI.getSetup();
      if (setup) {
        set((state) => ({
          scanSetup: {
            ...state.scanSetup,
            heightFrom: setup.height_from ?? DEFAULT_SCAN_SETUP.heightFrom,
            heightTo: setup.height_to ?? DEFAULT_SCAN_SETUP.heightTo,
            scanDurationS:
              setup.scan_duration_s ?? DEFAULT_SCAN_SETUP.scanDurationS,
            ean: setup.demo_ean ?? state.scanSetup.ean,
            snCount: setup.demo_sn_count ?? state.scanSetup.snCount,
          },
        }));
      }
    },

    reloadMasks: async () => {
      const rows = await window.dbAPI.getBarcodeMasks();
      const PRIORITY: Record<string, number> = { LPN: 0, EAN: 1 };
      const snMasks: DbMask[] = rows
        .map((m) => ({
          barcodeType: (['LPN', 'EAN', 'SN', 'NODEF'].includes(m.barcode_type)
            ? m.barcode_type
            : 'SN') as BarcodeType,
          name: m.barcode_type,
          regex: parseMaskPattern(m.barcode_mask),
        }))
        .sort(
          (a, b) =>
            (PRIORITY[a.barcodeType] ?? 2) - (PRIORITY[b.barcodeType] ?? 2),
        );
      set({ snMasks });
    },

    resetState: () => {
      set({
        cameraBtnDisabled: false,
        messages: [],
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

    setListening: (value: boolean) => {
      set({ isListening: value });
    },

    addConnection: async (form) => {
      const { connections } = get();
      const id = crypto.randomUUID();

      if (!form.host || !form.port) return;

      const conn: TcpConnection = {
        id,
        host: form.host,
        port: parseInt(form.port, 10),
        status: 'disconnected',
        workplace_id: form.workplace_id,
        camera_id: form.camera_id,
        lastConnected: null,
        messageCount: 0,
        autoReconnect: true,
      };

      try {
        await window.dbAPI.addSetupCamera({
          id,
          workplace_id: form.workplace_id,
          camera_id: form.camera_id,
          master_camera_ip: form.host,
          camera_port: parseInt(form.port, 10),
        });

        set({
          connections: [...connections, conn],
        });
      } catch (error) {
        console.error('Failed to add connection:', error);
      }
    },

    removeConnection: (id) => {
      const { connections, disconnectFromServer } = get();

      // Disconnect first
      disconnectFromServer(id);

      // Remove from storage
      window.dbAPI?.removeCamera(id);

      // Update state
      const newConnections = connections.filter((c) => c.id !== id);
      set({
        connections: newConnections,
        messages: get().messages.filter((m) => m.connectionId !== id),
      });
    },

    removeAllConnections: () => {
      const { disconnectAll } = get();
      disconnectAll();
      window.hostStore?.removeAllHosts();
      set({
        connections: [],
        messages: [],
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

    addMessage: async (connId, type, content: string) => {
      if (!get().isListening) {
        console.log('[addMessage] Not listening, ignoring incoming data.');
        return;
      }

      const heightRegex = /^\d{1,4}$/;

      // Strip control chars (STX, ETX, CR, LF, etc.) and whitespace
      const stripped = content.replace(/[\x00-\x1F\x7F\s]/g, '');

      // Check if raw content is a plain height value (e.g. "2121")
      if (heightRegex.test(stripped)) {
        const heightCm = parseInt(stripped, 10);
        get().updateScanSetup({ currentHeightCm: heightCm });
        return;
      }

      try {
        const json = await safeParseJSON(content);
        if (!Array.isArray(json?.codes)) {
          // Not a codes payload – ignore silently (no rogue trigger)
          console.warn('[addMessage] Received non-codes payload, skipping.');
          return;
        }

        // Extract height sensor codes (digits only) from json.codes
        const heightCodes = json.codes.filter((g: ContentBuild) =>
          heightRegex.test(g.content),
        );
        const barcodeCodes = json.codes.filter(
          (g: ContentBuild) => !heightRegex.test(g.content),
        );
        console.log('height code candidates', heightCodes);
        if (heightCodes.length > 0) {
          const heightCm = parseInt(heightCodes[0].content, 10);
          console.log(
            '[addMessage] Height sensor value received:',
            heightCm,
            'cm',
          );
          get().updateScanSetup({ currentHeightCm: heightCm });
        }

        const incomingCodes = barcodeCodes.map((g: ContentBuild) => ({
          content: g.content,
          corners: g.corners,
          added: false,
        }));

        const { scanSetup } = get();
        const duration = scanSetup.scanDurationS;

        // If scan duration is set, buffer codes and process after timer
        if (duration && duration > 0) {
          // Only add codes whose content is not already in the buffer
          for (const code of incomingCodes) {
            const existing = scanBufferMap.get(code.content);
            if (existing) {
              existing.count += 1;
            } else {
              scanBufferMap.set(code.content, { ...code, count: 1 });
            }
          }
          scanBufferConnId = connId;

          // If timer is already running, just accumulate
          if (scanBufferTimer) {
            console.log(
              '[addMessage] Buffering codes, timer already running. Total unique buffered:',
              scanBufferMap.size,
            );
            return;
          }

          // Start the collection timer
          console.log(`[addMessage] Starting scan buffer for ${duration}s`);
          scanBufferTimer = setTimeout(() => {
            const codes = Array.from(scanBufferMap.values());
            const bufferedConnId = scanBufferConnId!;
            // Reset buffer
            scanBufferMap = new Map();
            scanBufferConnId = null;
            scanBufferTimer = null;

            console.log(
              `[addMessage] Buffer complete. Processing ${codes.length} unique codes`,
            );
            console.log(
              '[addMessage] All unique codes:',
              codes.map((c) => c.content),
            );
            get()._processCollectedCodes(bufferedConnId, type, codes);
          }, duration * 1000);
          return;
        }

        // No duration set – process immediately
        get()._processCollectedCodes(connId, type, incomingCodes);
      } catch (error) {
        // Parsing failed – genuine JSON error, not a business logic error
        console.error('[addMessage] Failed to parse TCP payload:', error);
        // Do NOT send trigger here – a broken frame shouldn't fire the wrapping machine
      }
    },

    _processCollectedCodes: async (
      connId: string,
      type: string,
      codes: {
        content: string;
        corners?: { x: number; y: number }[];
        added: boolean;
      }[],
    ) => {
      // 1. Classify every barcode using DB-loaded masks
      const classified: ClassifiedCode[] = classifyCodes(codes, get().snMasks);

      // 2. Run ERR-01…ERR-05
      const { scanSetup } = get();
      console.log('ean a snCount', scanSetup.snCount, scanSetup.ean);

      const appMode = await window.authAPI.getAppMode();
      let validation: ScanValidationResult = validateScan(
        classified,
        scanSetup.snCount,
        appMode,
        scanSetup.ean,
      );

      // 3. ERR-06 – height (only when height sensor value is available)
      if (validation.ok && scanSetup.currentHeightCm !== null) {
        validation = validateHeight(
          scanSetup.currentHeightCm,
          scanSetup.heightFrom,
          scanSetup.heightTo,
        );
      }

      // 4. Extract useful values for WMS (always pick first valid one)
      const lpn = classified.find((c) => c.barcodeType === 'LPN')?.content;
      const ean = classified.find((c) => c.barcodeType === 'EAN')?.content;
      const serialNumbers = classified
        .filter((c) => c.barcodeType === 'SN')
        .map((c) => c.content);

      // 5. Determine message type based on validation outcome
      const messageType = validation.ok ? type : validation.error;

      const message: Message = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
        connectionId: connId,
        type: messageType,
        content: classified.map((c) => ({
          content: c.content,
          corners: c.corners,
          added: c.added,
          barcodeType: c.barcodeType,
          maskName: c.maskName,
        })),
        receivedTime: new Date().toISOString(),
        sendTime: null,
        validation,
        lpn,
        ean,
        serialNumbers,
      };

      set((state) => {
        let updated = [...state.messages, message];
        // Keep only last 10
        if (updated.length > 10) updated = updated.slice(updated.length - 10);
        return { messages: updated };
      });

      // 6. Log validation result for debugging
      if (!validation.ok) {
        console.warn(
          `[Scan validation] ${validation.error}`,
          validation.meta ?? '',
        );
      }

      // 7. Persist to database
      try {
        const now = new Date();
        const part = {
          id: message.id,
          created: now,
          user_id: null as string | null,
          lpn: lpn ?? '',
          ean: ean ?? '',
          sn_count: serialNumbers.length,
          status: validation.ok ? 'OK' : (validation.error ?? 'NOK'),
        };
        const scanEntries = classified.map((c) => ({
          id: crypto.randomUUID(),
          created: now,
          part_summary_id: message.id,
          user_id: null as string | null,
          barcode_type: c.barcodeType,
          barcode_value: c.content,
        }));
        await window.dbAPI.addPartSummary(part, scanEntries);
      } catch (err) {
        console.error(
          '[_processCollectedCodes] Failed to save scan to DB:',
          err,
        );
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

    setBridgeReady: (ready) => set({ bridgeReady: ready }),

    connectToServer: async (id) => {
      // get().disconnectAll();
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
      if (!window.tcpIp) return;

      connections
        .filter((c) => c.status === 'connected' && c.remoteId)
        .forEach((conn) => {
          window.tcpIp!.send(conn.remoteId!, messageText.trim());
        });
    },
    //TODO: TADY DOPRACOVAT
    initializeConnections: async () => {
      try {
        const [hosts, dbMasks, setup] = await Promise.all([
          window.dbAPI.getSetupCameras(),
          window.dbAPI.getBarcodeMasks(),
          window.dbAPI.getSetup(),
        ]);

        const PRIORITY: Record<string, number> = { LPN: 0, EAN: 1 };
        const snMasks: DbMask[] = dbMasks
          .map((m) => ({
            barcodeType: (['LPN', 'EAN', 'SN', 'NODEF'].includes(m.barcode_type)
              ? m.barcode_type
              : 'SN') as BarcodeType,
            name: m.barcode_type,
            regex: parseMaskPattern(m.barcode_mask),
          }))
          .sort(
            (a, b) =>
              (PRIORITY[a.barcodeType] ?? 2) - (PRIORITY[b.barcodeType] ?? 2),
          );

        const initialConnections = hosts.map((h) => ({
          id: h.id,
          name: '',
          host: h.master_camera_ip ? h.master_camera_ip : '',
          port: h.camera_port ? h.camera_port : 0,
          workplace_id: h.workplace_id,
          camera_id: h.camera_id,
          status: 'disconnected',
          lastConnected: null,
          messageCount: 0,
          autoReconnect: true,
        }));
        set({
          connections: initialConnections,
          snMasks,
          scanSetup: {
            ...get().scanSetup,
            heightFrom: setup?.height_from ?? DEFAULT_SCAN_SETUP.heightFrom,
            heightTo: setup?.height_to ?? DEFAULT_SCAN_SETUP.heightTo,
            scanDurationS:
              setup?.scan_duration_s ?? DEFAULT_SCAN_SETUP.scanDurationS,
            ean: setup?.demo_ean ?? DEFAULT_SCAN_SETUP.ean,
            snCount: setup?.demo_sn_count ?? DEFAULT_SCAN_SETUP.snCount,
          },
        });
      } catch (error) {
        console.error('Failed to initialize connections:', error);
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
