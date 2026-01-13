import React from 'react';
import { Wifi, Image, AlertCircle, CheckCircle, X } from 'lucide-react';
import './MessageLog.css';
import useTcpStore, { Message } from '../../../useTcpStore';
import { useTranslation } from 'react-i18next';

interface MessageLogProps {
  messages: Message[];
  messageLimit: number;
  onImageClick?: (imageName: string) => void;
  setHistory: React.Dispatch<React.SetStateAction<boolean>>;
  isOpen: boolean;
  onClose: () => void;
}

export default function EnhancedMessageLog({
  messages = [],
  messageLimit = 10,
  onImageClick,
  setHistory,
  isOpen,
  onClose,
}: MessageLogProps) {
  const { setImage } = useTcpStore();
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ok':
        return (
          <>
            <span className={`type-badge ${type}`}>
              <CheckCircle color="#0ea500" size={14} />
              <span>{t('home.messageLog.ok')}</span>
            </span>
          </>
        );
      case 'nok':
        return (
          <>
            <span className={`type-badge ${type}`}>
              <AlertCircle color="#a20000" size={14} />
              <span>{t('home.messageLog.notOk')}</span>
            </span>
          </>
        );
      default:
        return (
          <>
            <span className={`type-badge ${type}`}>
              <span>{t('home.messageLog.received')}</span>
            </span>
          </>
        );
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', width: '1200px', maxHeight: '90vh' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            {t('home.messageLog.title')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <X size={24} />
          </button>
        </div>
        <div className="message-log-container" style={{ border: 'none' }}>
          <div className="table-container">
            <table className="message-table">
              <thead>
                <tr>
                  <th>
                    <span>{t('home.messageLog.time')}</span>
                  </th>
                  <th>
                    <span>{t('home.messageLog.type')}</span>
                  </th>
                  <th>
                    <span>{t('home.messageLog.connect')}</span>
                  </th>
                  <th>
                    <span>{t('home.messageLog.job')}</span>
                  </th>
                  <th className="center">
                    <span>{t('home.messageLog.action')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-icon">
                          <Wifi size={40} />
                        </div>
                        <div className="empty-title">
                          {t('home.messageLog.noMessages1')}
                        </div>
                        <div className="empty-subtitle">
                          {t('home.messageLog.noMessages2')}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  messages
                    .slice(-messageLimit)
                    .reverse()
                    .map((msg, index) => (
                      <tr key={msg.id}>
                        <td>
                          <span className="timestamp">
                            {formatTimestamp(msg.receivedTime)}
                          </span>
                        </td>
                        <td>{getTypeIcon(msg.type)}</td>
                        <td>
                          <div className="content-wrapper">
                            <span className="content-badge">
                              {msg.content.length}{' '}
                              {msg.content.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="regime-value">
                            {msg.regime !== null ? msg.regime : 'N/A'}
                          </span>
                        </td>
                        <td className="actions-cell">
                          {msg.imageName && (
                            <button
                              onClick={() => {
                                setHistory(
                                  msg.type.toLowerCase() === 'received' &&
                                    index === 0,
                                );
                                setImage(msg.imageName, false, msg.content);
                                onClose();
                              }}
                              className="action-button"
                              title="View image"
                            >
                              <Image size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="footer">
            <span>
              Showing {Math.min(messageLimit, messages.length)} of{' '}
              {messages.length} messages
            </span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
