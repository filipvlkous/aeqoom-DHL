import { useEffect, useState } from 'react';
import useTcpStore from '../../useTcpStore';
import {
  FolderSearch2,
  FolderCheck,
  Plus,
  ChartColumn,
  History,
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

// Constants
const KEYBOARD_SHORTCUTS = {
  CAPTURE: 'KeyP',
  ADD: 'KeyA',
  SEND: 'KeyS',
} as const;

const MESSAGE_LIMIT = 10;

function Home() {
  const store = useTcpStore();
  const { t } = useTranslation();

  const [regimeCol, setRegimeCol] = useState<number[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [history, setHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [messageLogOpen, setMessageLogOpen] = useState(false);

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
      console.error('Failed to auto-start FTP server:', error);
    }
  };

  // Action Handlers
  const handlePhotoCapture = () => {
    setHistory(true);
    store.setImage(null, false);
    store.sendMessage('||>trigger on\r\n');
    store.setCameraBtnDisabled(true);
  };

  const handleSendData = async () => {
    setLoading(true);
    const toastId = toast.loading('Sending data...', {
      position: 'top-right',
    });

    store.setImage(null, false);
    const data = store.sendDataMessage();

    if (!data) {
      console.warn('No data to send');
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
        toast.update(toastId, {
          render: 'Data sent successfully!',
          type: 'success',
          isLoading: false,
          autoClose: 4000,
        });
        store.updateContend(true);
      } else {
        toast.update(toastId, {
          render: res.alensa.error || 'Failed to send data',
          type: 'error',
          isLoading: false,
          autoClose: 4000,
        });
        store.updateContend(false);
      }
    } catch (err) {
      toast.update(toastId, {
        render: 'An error occurred while sending data',
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
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
      // Prevent actions when modal is open
      if (openModal && event.code !== KEYBOARD_SHORTCUTS.ADD) return;

      switch (event.code) {
        case KEYBOARD_SHORTCUTS.CAPTURE:
          event.preventDefault();
          handlePhotoCapture();
          break;

        case KEYBOARD_SHORTCUTS.SEND:
          event.preventDefault();
          handleSendData();
          break;

        case KEYBOARD_SHORTCUTS.ADD:
          if (shouldShowAddButton()) {
            event.preventDefault();
            if (!openModal) {
              setOpenModal(true);
            } else {
              // Allow typing 'A' in input when modal is open
              const activeElement = document.activeElement as HTMLInputElement;
              if (activeElement?.tagName === 'INPUT') {
                const start =
                  activeElement.selectionStart ?? activeElement.value.length;
                const end =
                  activeElement.selectionEnd ?? activeElement.value.length;
                const newValue =
                  activeElement.value.substring(0, start) +
                  'A' +
                  activeElement.value.substring(end);

                activeElement.value = newValue;
                activeElement.setSelectionRange(start + 1, start + 1);
                activeElement.dispatchEvent(
                  new Event('input', { bubbles: true }),
                );
              }
            }
          }
          break;
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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm p-4 flex flex-col h-full">
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
        </div>

        <BottomSideControl />
      </aside>

      <main className="flex-1 flex flex-col">
        <ImagePanel
          toLastPhoto={toLastPhoto}
          handlePhotoCapture={handlePhotoCapture}
          handleSendData={handleSendData}
          history={history}
          loading={loading}
          lastPhoto={store.messages[store.messages.length - 1]}
        />
      </main>

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

export default Home;
