import { useTranslation } from 'react-i18next';
import useTcpStore from '../../../useTcpStore';

export default function StatusHeader() {
  const { t } = useTranslation();
  const store = useTcpStore();
  const activeCount = store.connections.filter(
    (c) => c.status === 'connected',
  ).length;

  return (
    <>
      <div className="camera-status p-3">
        <span
          className={`status-dot ${activeCount > 0 ? 'active' : 'inactive'}`}
        />
        <p className="text-sm font-medium text-gray-700">
          {t('home.statusHeader.cameraConnected')}
        </p>
      </div>
    </>
  );
}
