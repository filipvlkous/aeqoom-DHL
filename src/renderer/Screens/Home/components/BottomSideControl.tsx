import { Settings, Wifi, WifiOff, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useTcpStore from '../../../useTcpStore';
import './BottomSideControl.css';
import { useTranslation } from 'react-i18next';

export default function BottomSideControl() {
  const store = useTcpStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [selectedWorkplace, setSelectedWorkplace] = useState<string>('');

  useEffect(() => {
    window.workplaceStore.getSelectedWorkplace().then((wp: string) => {
      if (wp) setSelectedWorkplace(wp);
    });
  }, []);

  const workplaceConnection = store.connections.find(
    (c: any) => c.workplace_id === selectedWorkplace,
  );

  const isConnected = workplaceConnection?.status === 'connected';

  const handleSettingsClick = () => {
    setPassword('');
    setError(false);
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (password === '1234') {
      setShowModal(false);
      navigate('/settings');
    } else {
      setError(true);
    }
  };

  return (
    <div className="mt-4 h-[90%]">
      <div className="bottom-controls pt-4 flex flex-col items-center justify-between mb-10">
        {isConnected ? (
          <button
            onClick={() => store.disconnectFromServer(workplaceConnection!.id)}
            style={{
              display: 'flex',
              width: '100%',
              background: 'none',
              cursor: 'pointer',
              border: '1px solid #d1d5db',
            }}
            className="btn-link"
          >
            <WifiOff className="w-4 h-4" /> {t('home.bottomPanel.disconnected')}
          </button>
        ) : (
          <button
            onClick={() => {
              if (workplaceConnection) {
                store.connectAll();
              }
            }}
            disabled={
              !workplaceConnection ||
              workplaceConnection.status === 'connecting'
            }
            style={{
              display: 'flex',
              width: '100%',
              background: 'none',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
            }}
            className="btn-link"
          >
            <Wifi className="w-4 h-4" /> {t('home.bottomPanel.connected')}
          </button>
        )}
      </div>
      <button
        onClick={handleSettingsClick}
        style={{
          display: 'flex',
          width: '100%',
          background: 'none',
          border: '1px solid #d1d5db',
          cursor: 'pointer',
        }}
        className="btn-link"
      >
        <Settings className="w-4 h-4" />
        <span>{t('home.bottomPanel.settings')}</span>
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              width: 320,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={20} />
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                {t('home.settings.modal.enterPassword')}
              </span>
            </div>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              placeholder={t('home.settings.modal.passwordPlaceholder')}
              style={{
                padding: '8px 12px',
                border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
                borderRadius: 6,
                fontSize: 14,
                outline: 'none',
              }}
            />
            {error && (
              <span style={{ color: '#ef4444', fontSize: 13 }}>
                {t('home.settings.modal.errorValidation')}
              </span>
            )}
            <div
              style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  background: '#fff',
                }}
              >
                {t('home.settings.modal.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#3b82f6',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {t('home.settings.modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
