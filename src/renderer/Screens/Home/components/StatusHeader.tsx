import { useTranslation } from 'react-i18next';
import logo from '../../../../../assets/logo.png';
import useTcpStore from '../../../useTcpStore';

export default function StatusHeader() {
  const { t } = useTranslation();
  const store = useTcpStore();
  const activeCount = store.connections.filter(
    (c) => c.status === 'connected',
  ).length;

  return (
    <>
      <img
        style={{ width: '140px', height: '80px' }}
        className="logo-img  pb-4"
        src={logo}
        alt="Logo"
      />
      {/* Camera Status */}
      <div className="camera-status p-3">
        <p className="text-sm font-medium text-gray-700">
          {t('home.statusHeader.cameraConnected')}
        </p>
        <span
          className={`status-dot ${activeCount > 0 ? 'active' : 'inactive'}`}
        />
      </div>
      {/* FTP Status */}
      <div className="camera-status p-3">
        <p className="text-sm font-medium text-gray-700">
          {t('home.statusHeader.ftpConnected')}
        </p>
        <span
          className={`status-dot ${store.ftpConnected ? 'active' : 'inactive'}`}
        />
      </div>
      {/* Total Photos */}
      <div className="stats-container p-3 rounded-md bg-green-50 border-l-4 border-green-500">
        <p className="text-sm font-medium text-gray-700">
          {t('home.statusHeader.imageNumber')}
        </p>
        <p className="text-lg font-bold">{store.totalPhotos}</p>
      </div>
    </>
  );
}
