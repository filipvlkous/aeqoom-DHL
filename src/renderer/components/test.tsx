import { useEffect, useState } from 'react';
import useTcpStore from '../useTcpStore';
import {
  MessageCircle,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Settings,
  X,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { FtpConfig } from '../../main/serverStore/types';
import { useTranslation } from 'react-i18next';
import './settings.css';

interface NewConnectionForm {
  name: string;
  host: string;
  port: string;
}

const ConnectionManagerView: React.FC = () => {
  const {
    connections,
    activeConnection,
    setActiveConnection,
    addConnection,
    removeConnection,
    connectToServer,
    disconnectFromServer,
    removeAllConnections,
    addRegime,
    removeRegime,
  } = useTcpStore();
  const { t, i18n } = useTranslation();

  console.log('Connections:', connections);
  const [newConnection, setNewConnection] = useState<NewConnectionForm>({
    name: '',
    host: '',
    port: '',
  });

  const [ftpConfig, setFtpConfig] = useState<FtpConfig>({
    port: 0,
    host: '',
    anonymous: false,
    username: '',
    password: '', // TODO: Use environment variables in production
    rootPath: '',
    pasvUrl: '',
    pasvMin: 0,
    pasvMax: 0,
  });

  const [regimeCol, setRegimeCol] = useState<number[]>([]);
  const [newRegime, setNewRegime] = useState<string>('');
  const [showRegimeForm, setShowRegimeForm] = useState(false);

  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.host || !newConnection.port) {
      return;
    }
    await addConnection(newConnection);
    setNewConnection({ name: '', host: '', port: '' });
  };

  const handleAddRegime = async () => {
    const regimeNumber = parseInt(newRegime, 10);

    if (!isNaN(regimeNumber) && regimeNumber > 0) {
      try {
        await addRegime(regimeNumber);
        await getRegimeList();
        setNewRegime('');
        setShowRegimeForm(false);
      } catch (error) {
        console.error('Error adding regime:', error);
      }
    }
  };

  const handleRemoveRegime = async (regime: number) => {
    try {
      await removeRegime(regime);
      await getRegimeList();
    } catch (error) {
      console.error('Error removing regime:', error);
    }
  };

  const getStatusColor = (s: string) =>
    ({
      connected: 'text-green-500',
      connecting: 'text-blue-500',
      disconnected: 'text-gray-500',
      error: 'text-red-500',
    })[s] || 'text-gray-500';

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'connecting':
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const getRegimeList = async () => {
    const regimes = (await window.hostStore.getRegime()) ?? [];
    setRegimeCol(regimes);
  };

  const getFTPConfig = async () => {
    const config = (await window.ftpAPI.getFtpConfig()) ?? [];

    setFtpConfig(config);
    // setRegimeCol(regimes);
  };

  const sendFtpConfig = async () => {
    await window.ftpAPI.setFtpConfig(ftpConfig);
  };

  const resetFtpConfig = async () => {
    await window.ftpAPI.resetFtpConfig();
  };

    const [inactivityMinutes, setInactivityMinutes] = useState<string>(() => {
      return localStorage.getItem('inactivityMinutes') ?? '60';
    });

    const handleInactivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '');
      setInactivityMinutes(val);
      if (val && parseInt(val, 10) > 0) {
        localStorage.setItem('inactivityMinutes', val);
      }
    };

  useEffect(() => {
    getRegimeList();
    getFTPConfig();
  }, []);

  const setLang = (data: string) => {
    i18n.changeLanguage(data);
    localStorage.setItem('lang', JSON.stringify(data));
  };

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      style={{ paddingTop: 20 }}
    >
      {/* Add Connection Form */}
      <div className="lg:col-span-1 space-y-6">
        {/* Connection Form */}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="language-select-wrapper">
            <Globe className="globe-icon" />
            <select
              value={i18n.language}
              onChange={(e) => setLang(e.target.value)}
              className="language-select"
            >
              <option value="en">English</option>
              <option value="cs">Čeština</option>
            </select>
            <ChevronDown className="chevron-icon" />
          </div>
          <h2 className="text-xl font-semibold flex items-center ">
            {t('settings.ftpTitleSettings')}
          </h2>
          {/* FTP Config Form */}
          {(
            [
              {
                key: 'host',
                label: t('settings.ftp.host'),
                type: 'text',
                placeholder: 'ftp.example.com',
              },
              {
                key: 'port',
                label: t('settings.ftp.port'),
                type: 'number',
                placeholder: '21',
              },
              {
                key: 'username',
                label: t('settings.ftp.username'),
                type: 'text',
                placeholder: 'ftpuser',
              },
              {
                key: 'password',
                label: t('settings.ftp.password'),
                type: 'password',
                placeholder: '••••••••',
              },
              // {
              //   key: 'rootPath',
              //   label: 'Root Path',
              //   type: 'text',
              //   placeholder: '/uploads',
              // },
              {
                key: 'pasvUrl',
                label: 'Passive URL',
                type: 'text',
                placeholder: 'http://public-ip',
              },
              {
                key: 'pasvMin',
                label: 'Passive Min Port',
                type: 'number',
                placeholder: '50000',
              },
              {
                key: 'pasvMax',
                label: 'Passive Max Port',
                type: 'number',
                placeholder: '51000',
              },
            ] as const
          ).map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                type={type}
                value={
                  typeof ftpConfig[key as keyof FtpConfig] === 'number'
                    ? String(ftpConfig[key as keyof FtpConfig]) // cast numbers to string
                    : ((ftpConfig[key as keyof FtpConfig] as string) ?? '')
                }
                onChange={(e) =>
                  setFtpConfig((prev) => ({
                    ...prev,
                    [key]:
                      type === 'number'
                        ? Number(e.target.value)
                        : e.target.value,
                  }))
                }
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.ftp.rootPath')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ftpConfig.rootPath}
                onChange={(e) =>
                  setFtpConfig((prev) => ({
                    ...prev,
                    rootPath: e.target.value,
                  }))
                }
                placeholder="/uploads"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md 
        focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={async () => {
                  try {
                    const folderPath = await window.ftpAPI.selectFolder();
                    if (folderPath) {
                      setFtpConfig((prev) => ({
                        ...prev,
                        rootPath: folderPath,
                      }));
                    }
                  } catch (err) {
                    console.error('Folder selection failed:', err);
                  }
                }}
                type="button"
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {t('settings.ftp.browse')}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            {' '}
            <button
              onClick={resetFtpConfig}
              style={{ marginTop: '10px' }}
              className="cursor-pointer pt-2 px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-green-600 flex items-center gap-1"
            >
              {t('settings.ftp.reset')}
            </button>
            <button
              onClick={sendFtpConfig}
              style={{ marginTop: '10px' }}
              className="cursor-pointer pt-2 px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-1"
            >
              {t('settings.ftp.save')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <label
            style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '8px',
              fontSize: '14px',
              color: '#374151',
            }}
          >
            {t('settings.inactivityTimeout.label')}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min={1}
              value={inactivityMinutes}
              onChange={handleInactivityChange}
              style={{
                width: '80px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
              }}
            />
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {t('settings.inactivityTimeout.unit')}
            </span>
          </div>
          <p style={{ marginTop: '6px', fontSize: '12px', color: '#9ca3af' }}>
            {t('settings.inactivityTimeout.hint')}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Regime Management */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {t('settings.job.jobsTitle')}
            </h2>
            <button
              onClick={() => setShowRegimeForm(!showRegimeForm)}
              className="cursor-pointer px-3 py-1 text-sm border rounded-md hover:bg-green-600 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {t('settings.job.add')}
            </button>
          </div>

          {/* Add Regime Form */}
          {showRegimeForm && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <input
                  required
                  type="number"
                  value={newRegime}
                  onChange={(e) => setNewRegime(e.target.value)}
                  placeholder={t('settings.job.addPlaceholder')}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRegime()}
                />
                <button
                  onClick={handleAddRegime}
                  disabled={
                    !newRegime ||
                    isNaN(parseInt(newRegime)) ||
                    parseInt(newRegime) <= 0
                  }
                  className="cursor-pointer px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('settings.job.add')}
                </button>
                <button
                  onClick={() => {
                    setShowRegimeForm(false);
                    setNewRegime('');
                  }}
                  className="cursor-pointer px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Regime List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {regimeCol.map((regime: number, index: number) => (
              <div
                key={`${regime}-${index}`}
                className="flex items-center justify-between p-2 "
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="font-medium"> {regime}</span>
                </div>
                <button
                  onClick={() => handleRemoveRegime(regime)}
                  className="cursor-pointer text-red-500 hover:text-red-700 p-1"
                  title={t('settings.job.remove')}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {regimeCol.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Settings className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t('settings.job.empty')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connections List */}

      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">
            {t('settings.addConnection.title')}
          </h2>
          <div className="space-y-4">
            {(['name', 'host', 'port'] as (keyof NewConnectionForm)[]).map(
              (field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t(`settings.addConnection.${field}`)}
                  </label>
                  <input
                    required
                    type={field === 'port' ? 'number' : 'text'}
                    value={newConnection[field]}
                    onChange={(e) =>
                      setNewConnection((nc) => ({
                        ...nc,
                        [field]: e.target.value,
                      }))
                    }
                    placeholder={
                      field === 'host'
                        ? 'e.g. 192.168.1.100'
                        : field === 'port'
                          ? '8080'
                          : 'Server Name'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ),
            )}
            <button
              onClick={handleAddConnection}
              disabled={
                !newConnection.name ||
                !newConnection.host ||
                !newConnection.port
              }
              className="w-1/4 cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('settings.addConnection.add')}
            </button>
          </div>
        </div>
        <div
          style={{ marginTop: 10 }}
          className="bg-white rounded-lg pt-2 shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {t('settings.connectionList.title')} ({connections.length})
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="text-green-500">
                {t('settings.connectionList.online')}:{' '}
                {connections.filter((c) => c.status === 'connected').length}
              </span>
              <span className="text-red-500">
                {t('settings.connectionList.offline')}:{' '}
                {connections.filter((c) => c.status !== 'connected').length}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {connections.map((conn) => (
              <div
                key={conn.id}
                onClick={() => setActiveConnection(conn.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeConnection === conn.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={getStatusColor(conn.status)}>
                      {getStatusIcon(conn.status)}
                    </div>
                    <span className="font-medium">{conn.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConnection(conn.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    title={t('settings.connectionList.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {conn.host}:{conn.port}
                </div>
                <div
                  style={{ justifyContent: 'end' }}
                  className="flex items-center"
                >
                  <div className="flex gap-2">
                    {conn.status === 'connected' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          disconnectFromServer(conn.id);
                        }}
                        className="cursor-pointer px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        {t('settings.connectionList.disconnect')}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          connectToServer(conn.id);
                        }}
                        disabled={conn.status === 'connecting'}
                        className="cursor-pointer px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {conn.status === 'connecting'
                          ? t('settings.connectionList.connecting')
                          : t('settings.connectionList.connect')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {connections.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p> {t('settings.connectionList.noCamera1')}</p>
                <p className="text-sm mt-1">
                  {t('settings.connectionList.noCamera2')}
                </p>
              </div>
            )}
          </div>

          {/* <button
            style={{ marginTop: '20px' }}
            onClick={removeAllConnections}
            disabled={connections.length === 0}
            className="mt-4 w-1/4 justify-end px-4 py-2 cursor-pointer bg-red-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('settings.connectionList.removeAll')}
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default ConnectionManagerView;
