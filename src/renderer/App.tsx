// App.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Screens/Home/home';
import Settings from './Screens/settings/settings';
import useTcpStore, { Message } from './useTcpStore';
import './App.css';
import Login from './Screens/Login/Login';
import { toast } from 'react-toastify';
import i18n from '../i18n';
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
      setAppMode: (mode: string) => Promise<void>;
      getAppMode: () => Promise<string>;
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
    APIs: {
      sendDataToApis: (message: Message) => Promise<{
        alensa: { success: boolean; error: null | string };
        supabase: { success: boolean; error: null | string };
      }>;
    };
    dataStorage: {};
  }
}

function App() {
  //:TODO: remove test default value
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(true);
  const store = useTcpStore();

  const handleLogout = useCallback(async () => {
    try {
      // const result = await window.authAPI.logout();
      // if (!result.success) {
      //   toast.error(result.error || 'Logout failed', { autoClose: false });
      // } else {
      //   toast.success('Logged out successfully');
      // }
      localStorage.removeItem('authToken');
      await window.authAPI.setAppMode('');
      setAuthToken('');
    } catch (error: any) {
      toast.error(error?.message || 'An error occurred during logout', {
        autoClose: false,
      });
    }
  }, []);

  const initializeConnections = useTcpStore(
    (state) => state.initializeConnections,
  );
  const initializeDataListener = useTcpStore(
    (state) => state.initializeDataListener,
  );
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
      console.log('TCP bridge is ready');
      setBridgeReady(true);
      initializeConnections();
      const unsubscribe = initializeDataListener();

      return unsubscribe;
    }
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
    </Routes>
  );
}

export default App;
