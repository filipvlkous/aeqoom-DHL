import { useEffect, useRef, useState } from 'react';
import useTcpStore from '../../useTcpStore';
import { LogOut, AlertTriangle } from 'lucide-react';
import logo from '../../../../assets/logo.png';
import './home.css';
import ImagePanel from './components/ImagePanel';
import BottomSideControl from './components/BottomSideControl';
import StatusHeader from './components/StatusHeader';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

// Constants
const MESSAGE_LIMIT = 10;

function Home({
  authToken,
  onLogout,
}: {
  authToken: string;
  onLogout: () => void;
}) {
  const store = useTcpStore();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [messageLogOpen, setMessageLogOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Action Handlers
  const handlePhotoCapture = () => {
    setShowSuccess(false);
    store.setCameraBtnDisabled(true);
    store.setListening(true);

    const interval = 200; // ms between captures
    const totalDuration = (store.scanSetup.scanDurationS ?? 10) * 1000;
    let elapsed = 0;

    const timer = setInterval(() => {
      store.sendMessage('||>trigger on\r\n');
      elapsed += interval;
      if (elapsed >= totalDuration) {
        clearInterval(timer);
        store.setListening(false);
        store.flushScanBuffer();
        store.setCameraBtnDisabled(false);
        store.setListening(false);
      }
    }, interval);

    // Fire immediately for the first capture
    store.sendMessage('START\r\n');
    store.sendMessage('||>trigger on\r\n');

    // setTimeout(() => {
    //   store.sendMessage('||>trigger off\r\n');
    //   store.setCameraBtnDisabled(false);
    //   store.setListening(false);
    // }, totalDuration);
  };

  const handleSendData = async () => {
    setLoading(true);
    const toastId = toast.loading('Sending data...', {
      position: 'top-right',
    });

    const data = store.sendDataMessage();

    if (!data) {
      toast.update(toastId, {
        render: 'No data to send',
        type: 'warning',
        isLoading: false,
        autoClose: 3000,
      });
      store.updateContend(false);
      setLoading(false);
      return;
    }

    try {
      const res = await window.APIs.sendDataToApis(data);

      if (res.alensa.success && res.supabase.success) {
        toast.dismiss(toastId);
        setShowSuccess(true);
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(
          () => setShowSuccess(false),
          60000,
        );
        store.updateContend(true);
      } else {
        toast.dismiss(toastId);
        setApiError(res.alensa.error || 'Failed to send data');
        store.updateContend(false);
      }
    } catch (err) {
      toast.dismiss(toastId);
      setApiError('An error occurred while sending data');
      store.updateContend(false);
    } finally {
      setLoading(false);
    }
  };
  const setLang = (data: string) => {
    i18n.changeLanguage(data);
    localStorage.setItem('lang', JSON.stringify(data));
  };
  // Keyboard Event Handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey) return;

      if (event.key === 'P') {
        event.preventDefault();
        handlePhotoCapture();
      } else if (event.key === 'S') {
        event.preventDefault();
        handleSendData();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [store.messages]);

  // Initialize
  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored) {
      console.log('Stored language found:', stored);
      i18n.changeLanguage(JSON.parse(stored));
    }
  }, []);

  // Render Helpers

  return (
    <div style={styles.container} className="bg-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <aside
        style={{ height: '100vh' }}
        className="w-64 bg-white border-r shadow-sm p-4 flex flex-col"
      >
        <img
          style={{ width: '140px', height: '80px' }}
          className="logo-img  pb-4"
          src={logo}
          alt="Logo"
        />
        <div className="flex-1">
          <button
            onClick={() => {
              store.resetState();
              onLogout();
            }}
            style={{
              display: 'flex',
              width: '100%',
              background: 'none',
              cursor: 'pointer',
              border: '1px solid #d1d5db',
            }}
            className="btn-link"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout.button')}</span>
          </button>
          <BottomSideControl />
        </div>
        <StatusHeader />
      </aside>

      <div className="flex-1 flex flex-col min-h-0">
        <ImagePanel handlePhotoCapture={handlePhotoCapture} loading={loading} />
      </div>

      {apiError && (
        <div className="api-error-overlay">
          <div className="api-error-dialog">
            <div className="api-error-icon">
              <AlertTriangle size={32} />
            </div>
            <h3 className="api-error-title">{t('home.errorModal.title')}</h3>
            <p className="api-error-message">{apiError}</p>
            <button
              className="api-error-close-btn"
              onClick={() => setApiError(null)}
            >
              {t('home.errorModal.close')}
            </button>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={true}
        pauseOnHover={false}
        theme="colored"
        toastClassName="!rounded-2xl !shadow-lg !p-4"
      />

      <div
        className="lang-dropdown"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <p>Demo</p>
        <button
          className="lang-dropdown-toggle"
          onClick={() => setLangOpen((o) => !o)}
          onBlur={() => setTimeout(() => setLangOpen(false), 150)}
        >
          {(() => {
            const langFlags: Record<string, string> = {
              en: '🇬🇧',
              cs: '🇨🇿',
              de: '🇩🇪',
              fr: '🇫🇷',
              hu: '🇭🇺',
              pl: '🇵🇱',
              sk: '🇸🇰',
              ua: '🇺🇦',
            };
            return langFlags[i18n.language] || '🌐';
          })()}
        </button>
        {langOpen && (
          <div
            className="lang-dropdown-menu"
            style={{
              zIndex: 1000,
              border: '2px solid #3b82f6',
              background: 'white',
              position: 'absolute',
              top: 0,
            }}
          >
            {Object.keys(i18n.options?.resources || {}).map((code) => {
              const langFlags: Record<string, string> = {
                en: '🇬🇧',
                cs: '🇨🇿',
                de: '🇩🇪',
                fr: '🇫🇷',
                hu: '🇭🇺',
                pl: '🇵🇱',
                sk: '🇸🇰',
                ua: '🇺🇦',
              };

              const flag = langFlags[code] || '🌐';
              return (
                <button
                  key={code}
                  className={`lang-dropdown-item${i18n.language === code ? ' active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center' }}
                  onMouseDown={() => {
                    setLang(code);
                    setLangOpen(false);
                  }}
                >
                  <span style={{ fontSize: 24 }}>{flag}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'stretch',
    height: '100vh',
    width: '100vw',
  },
};

export default Home;
