import { Plus, Type, X } from 'lucide-react';
import React, { useState } from 'react';
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
  const [inc, setInc] = useState<number | ''>(1);

  const closeModal = () => {
    // toggleAddModal();
    setOpenModal(false);
    setItemText('');
  };

  const handleAdd = () => {
    if (itemText.trim() && typeof inc === 'number') {
      addContend(itemText.trim(), inc);
      closeModal();
    }
  };

  const handleCancel = () => {
    closeModal();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // handleAdd();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!modal) {
    return;
  }

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
          <div>
            <label htmlFor="item-input">.</label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '5px',
                justifyContent: 'end',
              }}
            >
              <button
                style={{
                  paddingInline: '20px',
                  backgroundColor: '#aaaaaa',
                  borderRadius: '5px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (inc == '') {
                    setInc(1);
                  } else {
                    setInc(inc + 1);
                  }
                }}
              >
                +
              </button>
              <input
                style={{ width: '30%' }}
                id="item-input"
                type="text"
                value={inc}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value === '') {
                    setInc('');
                    return;
                  }

                  const num = Number(value);

                  if (isNaN(num)) return;

                  if (num <= 0) {
                    setInc(1);
                  } else {
                    setInc(num);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '') setInc(1);
                }}
                onKeyDown={handleKeyPress}
              />
              <button
                onClick={() => {
                  if (inc === '') {
                    setInc(1);
                  } else {
                    if (inc > 1) {
                      setInc(inc - 1);
                    }
                  }
                }}
                style={{
                  paddingInline: '20px',
                  backgroundColor: '#aaaaaa',
                  borderRadius: '5px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                -
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="modal-actions">
          <button onClick={handleCancel} className="cancel-btn">
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
