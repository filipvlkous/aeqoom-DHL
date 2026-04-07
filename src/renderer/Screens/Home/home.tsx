import { useEffect, useRef, useState } from 'react';
import useTcpStore from '../../useTcpStore';
import {
  FolderSearch2,
  FolderCheck,
  CheckCircle,
  Plus,
  ChartColumn,
  History,
  LogOut,
  AlertTriangle,
  BookmarkX,
} from 'lucide-react';
import ModalAdd from './components/ModalAdd';
import './home.css';
import MessageLog from './components/MessageLog';
import ImagePanel from './components/ImagePanel';
import BottomSideControl from './components/BottomSideControl';
import JobControl from './components/JobControl';
import StatusHeader from './components/StatusHeader';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import InboundSelect from '../InboundSelect/InboundSelect';

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
  const inboundId = useTcpStore((state) => state.inboundId);
  const setInboundId = useTcpStore((state) => state.setInboundId);

  // Restore inboundId from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('inboundId');
    if (stored) {
      const parsed = parseInt(stored, 10);
      console.log('Restoring inboundId from localStorage:', parsed);
      if (!isNaN(parsed)) setInboundId(parsed);
    }
  }, []);

  // Persist inboundId to localStorage whenever it changes
  useEffect(() => {
    if (inboundId !== null && inboundId !== undefined) {
      localStorage.setItem('inboundId', String(inboundId));
    } else {
      localStorage.removeItem('inboundId');
    }
  }, [inboundId]);

  const [regimeCol, setRegimeCol] = useState<number[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [history, setHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [messageLogOpen, setMessageLogOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestMessage = store.messages[store.messages.length - 1];

  // API Functions
  const fetchRegimeList = async () => {
    try {
      if (!window.hostStore?.getRegime) {
        console.error('hostStore API not available');
        return;
      }

      const regimes = await window.hostStore.getRegime();
      setRegimeCol(Array.isArray(regimes) ? regimes : []);
    } catch (error) {
      console.error('Error fetching regimes:', error);
      setRegimeCol([]);
    }
  };

  const toLastPhoto = () => {
    const img = store.messages[store.messages.length - 1];
    setHistory(true);
    store.setImage(img.imageName, false, img.content);
  };

  const startFtpServer = async () => {
    try {
      const result = await window.ftpAPI.startFtp();
      console.log('FTP Server auto-started:', result);
    } catch (error) {
      toast.error('Unable to start FTP server', {
        autoClose: false,
        closeOnClick: true,
      });
      console.error('Failed to auto-start FTP server:', error);
    }
  };

  // Action Handlers
  const handlePhotoCapture = () => {
    setShowSuccess(false);
    setHistory(true);
    store.setImage(null, false);
    store.sendMessage('||>trigger on\r\n');
    store.setCameraBtnDisabled(true);
    setTimeout(() => {
      store.setCameraBtnDisabled(false);
    }, 9000);
  };

  const handleSendData = async () => {
    setLoading(true);
    const toastId = toast.loading('Sending data...', {
      position: 'top-right',
    });

    store.setImage(null, false);
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

  const handleRegimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      store.setRegime(parseInt(value));
    }
  };

  // UI Helpers
  const getMessageStatus = () => {
    if (!latestMessage) return null;

    const contentLength = latestMessage.content.length;
    const regime = latestMessage.regime;

    if (Number.isNaN(regime)) return null;

    if (contentLength < regime!) {
      const missingCount = regime! - contentLength;
      return {
        type: 'missing',
        count: missingCount,
        icon: FolderSearch2,
        label: `${missingCount} Missing`,
        color: 'bg-red-500',
      };
    }

    if (contentLength === regime) {
      return {
        type: 'complete',
        icon: FolderCheck,
        label: 'All scanned',
        color: 'bg-green-500',
      };
    }

    if (contentLength > regime!) {
      const overCount = contentLength - regime!;
      return {
        type: 'over',
        count: overCount,
        icon: FolderSearch2,
        label: `${overCount} Over`,
        color: 'bg-red-500',
      };
    }

    return null;
  };

  const shouldShowAddButton = () => {
    if (!latestMessage) return false;
    const contentLength = latestMessage.content.length;
    const regime = latestMessage.regime;
    return contentLength < regime! || Number.isNaN(regime);
  };

  const getMessageCounter = () => {
    if (!latestMessage) return null;
    const contentLength = latestMessage.content.length;
    const regime = latestMessage.regime;

    return Number.isNaN(regime)
      ? contentLength
      : `${contentLength} / ${regime}`;
  };

  // Keyboard Event Handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey || openModal) return;

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
  }, [openModal, store.regime, store.messages]);

  // Initialize
  useEffect(() => {
    fetchRegimeList();
    startFtpServer();
    const stored = localStorage.getItem('lang');
    if (stored) {
      console.log('Stored language found:', stored);
      i18n.changeLanguage(JSON.parse(stored));
    }
  }, []);

  // Render Helpers
  const messageStatus = getMessageStatus();

  return (
    <div style={styles.container} className="bg-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <aside
        style={{ height: '100vh' }}
        className="w-64 bg-white border-r shadow-sm p-4 flex flex-col"
      >
        <div className="flex-1 space-y-4">
          <StatusHeader />

          {/* Message Controls */}
          {shouldShowAddButton() && history && (
            <div className="flex items-center gap-4">
              <button
                className="add-button px-2 py-1 rounded-full text-m"
                onClick={() => setOpenModal(true)}
                disabled={
                  store.messages[store.messages.length - 1].type !== 'received'
                }
              >
                <Plus className="w-4 h-4" /> {t('buttons.add')}
              </button>
              <span className="counter-badge text-blue-600 w-1/2 font-semibold bg-blue-50 px-2 py-1 rounded-full text-m">
                {getMessageCounter()}
              </span>
            </div>
          )}

          {/* Message Status */}
          {messageStatus && shouldShowAddButton() && history && (
            <div className="flex items-center gap-4">
              <span
                className={`w-full px-4 py-2 ${messageStatus.color} text-white rounded-md hover:bg-green-600 flex items-center justify-center gap-2`}
              >
                <messageStatus.icon className="w-5 h-5" />
                {messageStatus.label}
              </span>
            </div>
          )}

          <JobControl
            handleRegimeChange={handleRegimeChange}
            regimeCol={regimeCol}
          />

          <Link
            to="/dashboard"
            className="dashboard-link"
            // className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200 p-2 rounded-lg hover:bg-gray-50 w-full"
          >
            <ChartColumn />
            <span>{t('dashboard')}</span>
          </Link>

          <button
            onClick={() => setMessageLogOpen(true)}
            className="dashboard-link"
          >
            <History />
            <span>{t('history')}</span>
          </button>

          {/* Vytvořit box */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('home.createBox.title')}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => store.setCreateBox(true)}
                className={`cursor-pointer flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                  store.createBox
                    ? 'bg-green-500 text-white shadow-green-200 scale-105'
                    : 'bg-white text-gray-400 border border-gray-200 hover:border-green-300 hover:text-green-500'
                }`}
              >
                {t('home.createBox.yes')}
              </button>
              <button
                onClick={() => store.setCreateBox(false)}
                className={`cursor-pointer flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                  !store.createBox
                    ? 'bg-red-500 text-white shadow-red-200 scale-105'
                    : 'bg-white text-gray-400 border border-gray-200 hover:border-red-300 hover:text-red-500'
                }`}
              >
                {t('home.createBox.no')}
              </button>
            </div>
          </div>

          {/* Ukončit příjemku */}
          {inboundId && (
            <button
              onClick={async () => {
                if (!store.inboundId) return;
                const toastId = toast.loading(t('home.finishInbound.loading'));

                try {
                  const res = await window.inboundAPI.finishInbound(
                    store.inboundId,
                  );
                  if (res.success) {
                    store.resetState();
                    localStorage.removeItem('inboundId');
                    toast.update(toastId, {
                      render: t('home.finishInbound.success'),
                      type: 'success',
                      isLoading: false,
                      autoClose: 3000,
                    });
                  } else {
                    toast.update(toastId, {
                      render: res.error || t('home.finishInbound.error'),
                      type: 'error',
                      isLoading: false,
                      autoClose: 4000,
                    });
                  }
                } catch (err: any) {
                  toast.update(toastId, {
                    render: err.message || t('home.finishInbound.error'),
                    type: 'error',
                    isLoading: false,
                    autoClose: 4000,
                  });
                }
              }}
              className="finish-inbound-btn"
            >
              <BookmarkX className="w-4 h-4" />
              <span>{t('home.finishInbound.button')}</span>
            </button>
          )}

          {/* Logout button */}
          <button
            onClick={async () => {
              if (store.inboundId) {
                const res = await window.inboundAPI.finishInbound(
                  store.inboundId,
                );
                if (!res.success) {
                  toast.error(res.error || t('home.finishInbound.error'));
                }
                localStorage.removeItem('inboundId');
              }
              store.resetState();
              onLogout();
            }}
            className="finish-inbound-btn"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout.button')}</span>
          </button>

          {/* <button
            onClick={async () => {
              await localStorage.removeItem('authToken');
              await localStorage.removeItxem('inboundId');
            }}
            className="finish-inbound-btn"
          >
            <LogOut className="w-4 h-4" />
            reset
          </button> */}
        </div>

        <BottomSideControl />
      </aside>

      {!inboundId ? (
        <InboundSelect
          token={authToken}
          onInboundSelected={(id) => setInboundId(id)}
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <ImagePanel
            toLastPhoto={toLastPhoto}
            handlePhotoCapture={handlePhotoCapture}
            handleSendData={handleSendData}
            history={history}
            loading={loading}
            lastPhoto={store.messages[store.messages.length - 1]}
            showSuccess={showSuccess}
          />
        </div>
      )}

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

      <ModalAdd modal={openModal} setOpenModal={setOpenModal} />
      <MessageLog
        setHistory={setHistory}
        messageLimit={MESSAGE_LIMIT}
        messages={store.messages}
        isOpen={messageLogOpen}
        onClose={() => setMessageLogOpen(false)}
      />
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
