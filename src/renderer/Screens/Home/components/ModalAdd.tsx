import { Plus, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import './ModalAdd.css'; // import stylesheet
import useTcpStore from '../../../useTcpStore';
import { useTranslation } from 'react-i18next';

export default function ModalAdd({
  modal,
  setOpenModal,
}: {
  modal: boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { t } = useTranslation();
  const { addContend } = useTcpStore();
  const [itemText, setItemText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const closeModal = () => {
    setOpenModal(false);
    setItemText('');
  };

  const handleAdd = () => {
    if (itemText.trim()) {
      addContend(itemText.trim(), 1);
      setItemText('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  };

  if (!modal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Modal Header */}
        <div className="modal-header">
          <h2>{t('home.modalAdd.title')}</h2>
          <button onClick={closeModal} className="close-btn">
            <X size={24} />
          </button>
        </div>

        {/* Input Field */}
        <div className="modal-body">
          <div style={{ width: '100%' }}>
            <label htmlFor="item-input">{t('home.modalAdd.label')}</label>
            <input
              ref={inputRef}
              id="item-input"
              style={{ width: '95%' }}
              type="text"
              value={itemText}
              onChange={(e) => setItemText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('home.modalAdd.inputPlaceholder')}
              autoFocus
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="modal-actions">
          <button onClick={closeModal} className="cancel-btn">
            {t('home.modalAdd.cancelButton')}
          </button>
          <button
            onClick={handleAdd}
            disabled={!itemText.trim()}
            className="add-btn"
          >
            <Plus size={16} />
            {t('home.modalAdd.addButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
