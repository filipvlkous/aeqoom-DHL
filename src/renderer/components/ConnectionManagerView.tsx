import { useEffect, useState } from 'react';
import useTcpStore, { NewConnectionForm } from '../useTcpStore';
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
  Save,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './settings.css';



const ConnectionManagerView: React.FC = () => {
  const {
    connections,
    addConnection,
    removeConnection,
    connectToServer,
    disconnectFromServer,
    reloadSetup,
    initializeConnections,
  } = useTcpStore();
  const { t, i18n } = useTranslation();



  const [setupForm, setSetupForm] = useState({
    height_from: '',
    height_to: '',
    scan_duration_s: '',
    demo_ean: '',
    demo_sn_count: '',
  });
  const [setupId, setSetupId] = useState<string | null>(null);
  const [setupSaved, setSetupSaved] = useState(false);

  const [selectedWorkplace, setSelectedWorkplace] = useState<string>('');
  const [workplaceSaved, setWorkplaceSaved] = useState(false);
  const [newConnection, setNewConnection] = useState<NewConnectionForm>({
    workplace_id: selectedWorkplace,
    host: '',
    port: '',
    camera_id: '1',
  });

  useEffect(() => {
    setNewConnection((nc) => ({ ...nc, workplace_id: selectedWorkplace }));
  }, [selectedWorkplace]);

  useEffect(() => {
    window.dbAPI.getSetup().then((setup) => {
      if (setup) {
        setSetupId(setup.id);
        setSetupForm({
          height_from: String(setup.height_from),
          height_to: String(setup.height_to),
          scan_duration_s:
            setup.scan_duration_s != null ? String(setup.scan_duration_s) : '',
          demo_ean: setup.demo_ean ?? '',
          demo_sn_count:
            setup.demo_sn_count != null ? String(setup.demo_sn_count) : '',
        });
      }
    });
    window.workplaceStore.getSelectedWorkplace().then((wp: string) => {
      if (wp) setSelectedWorkplace(wp);
    });
  }, []);

  const handleWorkplaceChange = async (value: string) => {
    setSelectedWorkplace(value);
    await window.workplaceStore.setSelectedWorkplace(value);
    setWorkplaceSaved(true);
    await initializeConnections();
    setTimeout(() => setWorkplaceSaved(false), 2000);
  };

  const handleSaveSetup = async () => {
    if (Number(setupForm.height_from) > Number(setupForm.height_to)) {
      alert('Height from cannot be greater than Height to');
      return;
    }
    await window.dbAPI.upsertSetup({
      id: setupId ?? crypto.randomUUID(),
      height_from: Number(setupForm.height_from),
      height_to: Number(setupForm.height_to),
      scan_duration_s:
        setupForm.scan_duration_s !== ''
          ? Number(setupForm.scan_duration_s)
          : null,
      demo_ean: setupForm.demo_ean !== '' ? setupForm.demo_ean : null,
      demo_sn_count:
        setupForm.demo_sn_count !== ''
          ? Number(setupForm.demo_sn_count)
          : null,
    });
    await reloadSetup();
    setSetupSaved(true);
    setTimeout(() => setSetupSaved(false), 2000);
  };

  const handleAddConnection = async () => {
    if (!newConnection.host || !newConnection.port) {
      return;
    }
    if (connections.some((c) => c.camera_id === newConnection.camera_id)) {
      return;
    }
    await addConnection(newConnection);
    setNewConnection({
      workplace_id: selectedWorkplace,
      host: '',
      port: '',
      camera_id: '1',
    });
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

  return (
    <div className="" style={{ paddingTop: 20, width: '100%' }}>
      <div
        style={{ display: 'flex', flexDirection: 'row', width: '100%' }}
        className="gap-4"
      >
        <div
          className="bg-white rounded-lg shadow-sm p-6"
          style={{ flex: 1 / 2 }}
        >
          <h2 className="text-xl font-semibold mb-4">
            {t('settings.addConnection.title')}
          </h2>
          <div className="space-y-4">
            {(
              [
                {
                  key: 'height_from',
                  label: t(
                    'settings.addConnection.height_from',
                    'Height from (cm)',
                  ),
                },
                {
                  key: 'height_to',
                  label: t(
                    'settings.addConnection.height_to',
                    'Height to (cm)',
                  ),
                },
                {
                  key: 'scan_duration_s',
                  label: t(
                    'settings.addConnection.scan_duration_s',
                    'Scan duration (s)',
                  ),
                },
              ] as { key: keyof typeof setupForm; label: string }[]
            ).map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  value={setupForm[key]}
                  onChange={(e) =>
                    setSetupForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <button
              onClick={handleSaveSetup}
              className="w-1/4 cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {setupSaved
                ? t('settings.addConnection.saved', 'Saved!')
                : t('settings.addConnection.save', 'Save')}
            </button>
          </div>
        </div>
        <div
          className="bg-white rounded-lg shadow-sm p-6"
          style={{ flex: 1 / 2 }}
        >
          <h2 className="text-xl font-semibold mb-4">
            {t('settings.addConnection.workplace', 'Workplace')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t(
                  'settings.addConnection.selectedWorkplace',
                  'Selected Workplace',
                )}
              </label>
              <select
                value={selectedWorkplace}
                onChange={(e) => handleWorkplaceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— select —</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
            {workplaceSaved && <p className="text-sm text-green-600">Saved!</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.addConnection.demo_ean', 'Demo EAN')}
              </label>
              <input
                type="text"
                value={setupForm.demo_ean}
                onChange={(e) =>
                  setSetupForm((f) => ({ ...f, demo_ean: e.target.value }))
                }
                placeholder={t(
                  'settings.addConnection.demo_ean_placeholder',
                  'e.g. 1234567890123',
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.addConnection.demo_sn_count', 'Demo SN count')}
              </label>
              <input
                type="number"
                value={setupForm.demo_sn_count}
                onChange={(e) =>
                  setSetupForm((f) => ({ ...f, demo_sn_count: e.target.value }))
                }
                placeholder={t(
                  'settings.addConnection.demo_sn_count_placeholder',
                  'e.g. 5',
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSaveSetup}
              className="w-1/4 cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {setupSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          paddingTop: 20,
        }}
        className="gap-4"
      >
        <div
          className="bg-white rounded-lg shadow-sm pt-2 p-6"
          style={{ flex: 1 / 2 }}
        >
          <h2 className="text-xl font-semibold mb-4">
            {t('settings.addConnection.title')}
          </h2>
          <div className="space-y-4">
            {(['host', 'port'] as (keyof NewConnectionForm)[]).map((field) => (
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
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Camera
              </label>
              <select
                value={newConnection.camera_id}
                onChange={(e) =>
                  setNewConnection((nc) => ({
                    ...nc,
                    camera_id: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="3D">3D camera</option>
              </select>
              {connections.some(
                (c) => c.camera_id === newConnection.camera_id,
              ) && (
                <p className="text-sm text-red-500 mt-1">
                  Workplace {newConnection.camera_id} is already assigned to a
                  camera.
                </p>
              )}
            </div>
            <button
              onClick={handleAddConnection}
              disabled={
                !newConnection.host ||
                !newConnection.port ||
                connections.some((c) => c.camera_id === newConnection.camera_id)
              }
              className="w-1/4 cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('settings.addConnection.add')}
            </button>
          </div>
        </div>

        {/* Setup settings panel */}

        <div
          style={{ flex: 1 }}
          className="bg-white rounded-lg pt-2 shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {t('settings.connectionList.title')}
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

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {connections.map((conn) => (
              <div
                key={conn.id}
                style={{ alignItems: 'center', alignSelf: 'center' }}
                className={`p-3 rounded-lg border cursor-pointer transition-colors
                'border-gray-200 hover:border-gray-300'
              `}
              >
                <div
                  style={{ paddingBlock: 10 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={getStatusColor(conn.status)}>
                      {getStatusIcon(conn.status)}
                    </div>
                    <div className="text-sm text-black font-bold">
                      {conn.host}:{conn.port}
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      Camera {conn.camera_id}
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'row', gap: 10 }}
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
