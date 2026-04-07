// App.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Screens/Home/home';
import Settings from './Screens/settings/settings';
import useTcpStore, { Message } from './useTcpStore';
import { FtpConfig } from '../main/serverStore/types';
import './App.css';
import Dashboard from './Screens/Dashboard/Dashboard';
import Login from './Screens/Login/Login';
import { toast } from 'react-toastify';
declare global {
  interface Window {
    authAPI: {
      login: (payload: {
        id: number;
        hashedId: string;
      }) => Promise<{ token: string }>;
      getToken: () => Promise<string>;
      setToken: (token: string) => Promise<void>;
      clearToken: () => Promise<void>;
      logout: () => Promise<{ success: boolean; error: string | null }>;
    };
    inboundAPI: {
      startInbound: (inboundId: number, token: string) => Promise<void>;
      setInboundId: (id: number) => Promise<void>;
      getInboundId: () => Promise<number>;
      finishInbound: (
        id: number,
      ) => Promise<{ success: boolean; error: string | null }>;
    };
    ftpAPI: {
      startFtp: () => Promise<boolean>;
      stopFtp: () => Promise<boolean>;
      isFtpRunning: () => Promise<boolean>;
      getFtpConfig: () => Promise<FtpConfig>;
      setFtpConfig: (config: FtpConfig) => Promise<void>;
      resetFtpConfig: () => Promise<void>;
      selectFolder: () => Promise<any>;
      onFtpConnected: (value: any) => Promise<void>;
    };
    tcpIp: {
      connect: (
        host: string,
        port: number,
      ) => Promise<{ connectionId: string; status: string }>;
      send: (connectionId: string, msg: string) => Promise<void>;
      disconnect: (connectionId: string) => Promise<void>;
      onData: (
        callback: (connectionId: string, data: string) => void,
      ) => () => void;
    };
    imageAPI: {
      loadImage: (
        imageName: string,
        tempStoreMainImg: boolean,
        data?: any,
      ) => Promise<string>;
    };
    APIs: {
      sendDataToApis: (message: Message) => Promise<{
        alensa: { success: boolean; error: null | string };
        supabase: { success: boolean; error: null | string };
      }>;
    };
  }
}

function App() {
  //:TODO: remove test default value
  const [authToken, setAuthToken] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);
  const store = useTcpStore();

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      const result = await window.authAPI.logout();
      if (!result.success) {
        toast.error(result.error || 'Logout failed', { autoClose: false });
      } else {
        toast.success('Logged out successfully');
      }
      localStorage.removeItem('authToken');
      setAuthToken('');
    } catch (error: any) {
      toast.error(error?.message || 'An error occurred during logout', {
        autoClose: false,
      });
    }
  }, []);

  // Inactivity auto-logout
  useEffect(() => {
    if (!authToken) return;

    const getTimeoutMs = () => {
      const stored = localStorage.getItem('inactivityMinutes');
      const minutes = stored ? parseInt(stored, 10) : 60;
      return (isNaN(minutes) || minutes <= 0 ? 60 : minutes) * 60 * 1000;
    };

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(handleLogout, getTimeoutMs());
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((e) =>
      window.addEventListener(e, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [authToken, handleLogout]);

  const initializeConnections = useTcpStore(
    (state) => state.initializeConnections,
  );
  const initializeDataListener = useTcpStore(
    (state) => state.initializeDataListener,
  );
  const initFtpListener = useTcpStore((state) => state.initFtpListener);
  const setBridgeReady = useTcpStore((state) => state.setBridgeReady);

  // Persist authToken to localStorage whenever it changes
  useEffect(() => {
    if (authToken) {
      console.log(authToken);
      localStorage.setItem('authToken', authToken);
    }
  }, [authToken]);

  // Check for existing auth token on startup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await window.authAPI.getToken();
        if (token) {
          setAuthToken(token);
        } else {
          const stored = localStorage.getItem('authToken');
          console.log('No token from API, checking localStorage:', stored);
          if (stored) setAuthToken(stored);
        }
      } catch (err) {
        console.error('Failed to check auth token:', err);
        const stored = localStorage.getItem('authToken');
        if (stored) setAuthToken(stored);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authToken) return;

    if (window.tcpIp) {
      setBridgeReady(true);
      initializeConnections();
      initFtpListener();
      const unsubscribe = initializeDataListener();
      if (store.activeConnection) {
        store.connectToServer(store.activeConnection);
      }
      return unsubscribe;
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;

    const startFtpOnLoad = async () => {
      try {
        const result = await window.ftpAPI.startFtp();
        console.log('FTP Server auto-started:', result);
      } catch (error) {
        console.error('Failed to auto-start FTP server:', error);
      }
    };

    if (store.activeConnection) {
      store.connectToServer(store.activeConnection);
    }

    startFtpOnLoad();
  }, [authToken]);

  if (!authChecked) {
    return null; // loading
  }

  if (!authToken) {
    return (
      <Login
        onLoginSuccess={(token) => {
          console.log('Login successful, received token:', token);
          setAuthToken(token);
        }}
      />
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Home authToken={authToken} onLogout={handleLogout} />}
      />
      <Route path="/settings" element={<Settings />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
