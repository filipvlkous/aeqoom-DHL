import { Settings, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import useTcpStore from '../../../useTcpStore';
import './BottomSideControl.css';
import { useTranslation } from 'react-i18next';

export default function BottomSideControl() {
  const store = useTcpStore();
  const { t } = useTranslation();

  const isConnected = store.connections.some(
    (c: any) => c.status === 'connected',
  );

  return (
    <div className="mt-4 border-t border-gray-200">
      <div className="bottom-controls pt-4 flex flex-col items-center justify-between mb-10">
        {isConnected ? (
          <button
            onClick={store.disconnectAll}
            className="w-full px-4 py-2 cursor-pointer bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center gap-2 hover:scale-105 transition-all duration-200"
          >
            <WifiOff className="w-4 h-4" /> {t('home.bottomPanel.disconnected')}
          </button>
        ) : (
          <button
            onClick={() => {
              if (store.activeConnection) {
                store.connectToServer(store.activeConnection);
              }
            }}
            className="w-full px-4 py-2 cursor-pointer bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center justify-center gap-2 hover:scale-105 transition-all duration-200"
          >
            <Wifi className="w-4 h-4" /> {t('home.bottomPanel.connected')}
          </button>
        )}
      </div>
      <Link
        to="/settings"
        style={{ display: 'flex', width: '100%' }}
        className="btn-link"
      >
        <Settings />
        <span>{t('home.bottomPanel.settings')}</span>
      </Link>
    </div>
  );
}
