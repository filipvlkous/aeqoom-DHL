import { useState } from 'react';
import { Link } from 'react-router-dom';
import ConnectionManagerView from '../../components/ConnectionManagerView';
import ApiManagerView from '../../components/ApiManagerView';
import MaskManagerView from '../../components/MaskManagerView';
import './settings.css';

const TABS = [
  { id: 'connections', label: 'Connection Manager' },
  { id: 'api', label: 'API Manager' },
  { id: 'masks', label: 'Mask Manager' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const Settings = () => {
  const [activeTab, setActiveTab] = useState<TabId>('connections');

  return (
    <div style={{ padding: 20 }}>
      <Link to="/" className="btn-link">
        <span>← Back</span>
      </Link>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '2px solid #e5e7eb',
          marginTop: 20,
          marginBottom: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              borderBottom:
                activeTab === tab.id
                  ? '2px solid #3b82f6'
                  : '2px solid transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 14,
              marginBottom: -2,
              transition: 'all 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'connections' && <ConnectionManagerView />}
      {activeTab === 'api' && <ApiManagerView />}
      {activeTab === 'masks' && <MaskManagerView />}
    </div>
  );
};

export default Settings;
