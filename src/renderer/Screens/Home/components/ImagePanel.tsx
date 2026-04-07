import React from 'react';
import { Camera, Send, ThumbsUp, Loader2 } from 'lucide-react';
import useTcpStore, { Message } from '../../../useTcpStore';
import { useTranslation } from 'react-i18next';
import jpg from '../../../../../assets/DM282-RomeoDesk-382-72567170.jpg';
import svg from '../../../../../assets/DM282-RomeoDesk-382-72567170.svg';
type ImagePanelProps = {
  handlePhotoCapture: () => void;
  handleSendData: () => void;
  toLastPhoto: () => void;
  history: boolean;
  loading: boolean;
  lastPhoto: Message;
  showSuccess: boolean;
};

export default function ImagePanel({
  handlePhotoCapture,
  handleSendData,
  toLastPhoto,
  history,
  loading,
  lastPhoto,
  showSuccess,
}: ImagePanelProps) {
  const store = useTcpStore();
  const { t } = useTranslation();
  const isConnected = store.connections.some((c) => c.status === 'connected');

  return (
    <div className="flex flex-1 gap-4 pt-0 min-h-0">
      <div
        style={{ justifyContent: 'center', alignItems: 'center' }}
        className="bg-white rounded-xl shadow-lg flex flex-col h-full min-h-0 w-full"
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            width: '100%',
          }}
        >
          {showSuccess ? (
            <div
              style={{
                width: '97%',
                aspectRatio: '2660 / 1516',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.5rem',
              }}
            >
              <div
                style={{
                  background:
                    'linear-gradient(135deg, #bbf7d0 0%, #dcfce7 100%)',
                  borderRadius: '50%',
                  width: '10rem',
                  height: '10rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(34,197,94,0.25)',
                }}
              >
                <ThumbsUp size={72} color="#16a34a" strokeWidth={1.5} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#15803d',
                    margin: 0,
                  }}
                >
                  {t('home.imagePanel.successTitle')}
                </p>
                <p
                  style={{
                    fontSize: '1rem',
                    color: '#4ade80',
                    marginTop: '0.5rem',
                  }}
                >
                  {t('home.imagePanel.successSubtitle')}
                </p>
              </div>
            </div>
          ) : store.image && store.svgImage ? (
            <div
              style={{
                width: '97%',
                aspectRatio: '2660 / 1516',
                position: 'relative',
              }}
            >
              <img
                src={store.svgImage}
                alt="SVG Overlay"
                style={{
                  transform: 'scaleY(-1) scaleX(-1)',
                  transformOrigin: 'center center',
                  zIndex: 10,
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                }}
              />
              <img
                src={store.image}
                alt="Captured"
                style={{
                  transform: 'scaleY(-1) scaleX(-1)',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '2660 / 1516',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#9CA3AF',
              }}
            >
              <div
                style={{
                  margin: '0 auto 1rem',
                  opacity: 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={64} />
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                {t('home.imagePanel.noImage1')}
              </p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {t('home.imagePanel.noImage2')}
              </p>
            </div>
          )}
        </div>

        <div
          className="button-container"
          style={{ marginTop: 'auto', marginBottom: '1rem' }}
        >
          {isConnected && store.regime !== null ? (
            <button
              disabled={store.cameraBtnDisabled || loading}
              onClick={handlePhotoCapture}
              className="photo-button"
            >
              {store.cameraBtnDisabled || loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Camera size={20} />
              )}
              {store.cameraBtnDisabled || loading
                ? t('home.imagePanel.loading')
                : t('home.imagePanel.takePhoto')}
            </button>
          ) : (
            <button className="disabled-button" disabled>
              {t('home.imagePanel.connectCamera')}
            </button>
          )}
          {store.image &&
            history &&
            lastPhoto.type !== 'OK' &&
            lastPhoto.type !== 'NOK' && (
              <button className="send-button" onClick={handleSendData}>
                <Send size={20} />
                {t('home.imagePanel.send')}
              </button>
            )}
          {!history && (
            <button onClick={toLastPhoto} className="photo-button">
              {t('home.imagePanel.lastPhoto')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
