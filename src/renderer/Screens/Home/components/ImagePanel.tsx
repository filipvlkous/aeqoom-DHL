import React from 'react';
import { Camera, Send } from 'lucide-react';
import useTcpStore, { Message } from '../../../useTcpStore';
import { useTranslation } from 'react-i18next';

type ImagePanelProps = {
  handlePhotoCapture: () => void;
  handleSendData: () => void;
  toLastPhoto: () => void;
  history: boolean;
  loading: boolean;
  lastPhoto: Message;
};

export default function ImagePanel({
  handlePhotoCapture,
  handleSendData,
  toLastPhoto,
  history,
  loading,
  lastPhoto,
}: ImagePanelProps) {
  const store = useTcpStore();
  const { t } = useTranslation();
  const isConnected = store.connections.some((c) => c.status === 'connected');

  return (
    <div className="flex flex-1 gap-4 m-4">
      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col w-full border border-gray-200">
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '24rem',
          }}
        >
          {store.image && store.svgImage ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={store.svgImage}
                alt="SVG Overlay"
                style={{
                  transform: 'scaleY(-1)',
                  transformOrigin: 'center center', // Add this
                  zIndex: 10,
                  minHeight: '40rem',
                  position: 'absolute',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                }}
              />
              <img
                src={store.image}
                alt="Captured"
                style={{
                  transform: 'scaleY(-1)',
                  minHeight: '40rem',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                minHeight: '40rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#9CA3AF',
                height: '100%',
                width: '100%',
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

        <div className="button-container">
          {isConnected && store.regime !== null ? (
            <button
              disabled={store.cameraBtnDisabled || loading}
              onClick={handlePhotoCapture}
              className="photo-button"
            >
              {(!store.cameraBtnDisabled || loading) && <Camera size={20} />}
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
