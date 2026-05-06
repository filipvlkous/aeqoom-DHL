import { Camera, Loader2, AlertTriangle } from 'lucide-react';
import useTcpStore from '../../../useTcpStore';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { ErrorCode } from '../../../../main/utils/barcodeValidator';

type ImagePanelProps = {
  handlePhotoCapture: () => void;
  loading: boolean;
};

function countOccurrences(arr: string[]): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

function ErrorDetails({
  error,
  meta,
  serialNumbers,
}: {
  error: ErrorCode;
  meta?: Record<string, unknown>;
  serialNumbers?: string[];
}) {
  const { scanSetup } = useTcpStore();
  const { t } = useTranslation();
  const listStyle: React.CSSProperties = {
    margin: '8px 0 0',
    padding: 0,
    listStyle: 'none',
    fontSize: 17,
    color: 'yellow',
    textAlign: 'center' as const,
  };

  switch (error) {
    case 'ERR-01':
      return (
        <p style={{ color: 'yellow' }}>{t('home.errorMessages.ERR-01')}</p>
      );

    case 'ERR-02': {
      const counts = countOccurrences((meta?.lpns as string[]) ?? []);
      return (
        <>
          <p style={{ color: 'yellow' }}>{t('home.errorMessages.ERR-02')}</p>
          <ul style={listStyle}>
            {Object.entries(counts).map(([lpn, n]) => (
              <li key={lpn}>
                {lpn} ({n}×)
              </li>
            ))}
          </ul>
        </>
      );
    }

    case 'ERR-03':
      return (
        <p style={{ color: 'yellow' }}>{t('home.errorMessages.ERR-03')}</p>
      );

    case 'ERR-04': {
      const counts = countOccurrences((meta?.eans as string[]) ?? []);
      const max = Math.max(...Object.values(counts));
      return (
        <>
          <p style={{ color: 'yellow' }}>{t('home.errorMessages.ERR-04')}</p>
          <ul style={listStyle}>
            {Object.entries(counts).map(([ean, n]) => (
              <li key={ean}>
                {ean}{' '}
                {n < max ? (
                  <strong style={{ color: 'yellow' }}>(!)</strong>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      );
    }

    case 'ERR-05': {
      const sns = [...(serialNumbers ?? [])].sort();
      const expectedSN = scanSetup.snCount;
      const foundSN = sns.length;

      return (
        <>
          <p style={{ color: 'yellow' }}>
            {t('home.errorMessages.ERR-05', {
              expectedSN,
              foundSN,
            })}
            <br />
          </p>
          {sns.length > 0 && (
            <div
              style={{
                marginTop: 8,
                fontSize: 17,
                color: 'yellow',
              }}
            >
              {sns.join(', ')}
            </div>
          )}
        </>
      );
    }

    case 'ERR-06': {
      const height = meta?.height as number;
      return (
        <p style={{ color: 'yellow' }}>
          {t('home.errorMessages.ERR-06', { height })}
        </p>
      );
    }

    default:
      return null;
  }
}

export default function ImagePanel({
  handlePhotoCapture,
  loading,
}: ImagePanelProps) {
  const store = useTcpStore();
  const { t } = useTranslation();
  const [working, setWorking] = useState(false);
  const lastMessageIdRef = useRef<string | undefined>(undefined);

  const lastMessage = store.messages[store.messages.length - 1];
  const validation = lastMessage?.validation;
  const hasError = validation && !validation.ok;
  const isConnected = store.connections.some((c) => c.status === 'connected');

  useEffect(() => {
    if (lastMessage?.id && lastMessage.id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastMessage.id;
      setWorking(false);
    }
  }, [lastMessage?.id]);

  const handleCapture = () => {
    setWorking(true);
    handlePhotoCapture();
  };

  return (
    <div
      className="flex flex-1 gap-4 pt-0 min-h-0"
      style={{ position: 'relative' }}
    >
      <div
        style={{ justifyContent: 'center', alignItems: 'center' }}
        className="bg-white rounded-xl shadow-lg flex flex-col h-full min-h-0 w-full overflow-hidden"
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
          {working ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f97316',
                gap: 16,
              }}
            >
              <Loader2 size={64} color="#fff" className="animate-spin" />
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: 4,
                }}
              >
                Working...
              </span>
            </div>
          ) : hasError && validation && !validation.ok ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ef4444',
                gap: 12,
                padding: '24px',
                overflowY: 'auto',
              }}
            >
              <AlertTriangle size={56} color="yellow" />
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: 'yellow',
                  letterSpacing: 4,
                }}
              >
                {validation.error}
              </span>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 500,
                  color: 'yellow',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                <ErrorDetails
                  error={validation.error}
                  meta={validation.meta}
                  serialNumbers={lastMessage?.serialNumbers}
                />
              </div>
            </div>
          ) : validation?.ok ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#4caf50',
                padding: '32px 40px',
                overflowY: 'auto',
              }}
            >
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: '#fff',
                  alignSelf: 'center',
                  marginBottom: 32,
                }}
              >
                OK
              </span>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { label: 'LPN:', value: lastMessage?.lpn ?? '—' },
                    { label: 'EAN:', value: lastMessage?.ean ?? '—' },
                    {
                      label: 'SN:',
                      value: lastMessage?.serialNumbers?.length ?? 0,
                    },
                    {
                      label: 'Výška:',
                      value:
                        store.scanSetup.currentHeightCm !== null
                          ? `${store.scanSetup.currentHeightCm} cm`
                          : '—',
                    },
                  ].map(({ label, value }) => (
                    <tr key={label}>
                      <td
                        style={{
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: 22,
                          paddingRight: 24,
                          paddingBottom: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                      </td>
                      <td
                        style={{
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 22,
                          paddingBottom: 12,
                        }}
                      >
                        {String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div
          className="button-container"
          style={{ marginTop: 'auto', marginBottom: '1rem' }}
        >
          {isConnected ? (
            <button
              disabled={store.cameraBtnDisabled || loading}
              onClick={handleCapture}
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
          ) : null}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
          backgroundColor: 'red',
        }}
      >
        <p
          style={{
            color: 'black',
            fontSize: '3rem',
            fontWeight: 'bold',
            textAlign: 'center',
            margin: 0,
            padding: '8px 24px',
          }}
        >
          DEMO
        </p>
      </div>
    </div>
  );
}
