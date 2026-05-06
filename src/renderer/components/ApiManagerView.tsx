import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import useTcpStore from '../useTcpStore';
import './settings.css';

interface ApiForm {
  host_port_test: string;
  host_port_prod: string;
  wms_api_username: string;
  wms_api_password_test: string;
  wms_api_password_prod: string;
  uri_auth: string;
  uri_user_validation: string;
  uri_part_summary: string;
  uri_scans: string;
}

const FIELDS: { key: keyof ApiForm; label: string; type?: string }[] = [
  { key: 'host_port_test', label: 'Host:Port (Test)' },
  { key: 'host_port_prod', label: 'Host:Port (Prod)' },
  { key: 'wms_api_username', label: 'WMS API Username' },
  {
    key: 'wms_api_password_test',
    label: 'WMS API Password (Test)',
    type: 'password',
  },
  {
    key: 'wms_api_password_prod',
    label: 'WMS API Password (Prod)',
    type: 'password',
  },
];

const FIELDSURI: { key: keyof ApiForm; label: string; type?: string }[] = [
  { key: 'uri_auth', label: 'URI – Auth' },
  { key: 'uri_user_validation', label: 'URI – User Validation' },
  { key: 'uri_part_summary', label: 'URI – Part Summary' },
  { key: 'uri_scans', label: 'URI – Scans' },
];

const EMPTY: ApiForm = {
  host_port_test: '',
  host_port_prod: '',
  wms_api_username: '',
  wms_api_password_test: '',
  wms_api_password_prod: '',
  uri_auth: '',
  uri_user_validation: '',
  uri_part_summary: '',
  uri_scans: '',
};

const ApiManagerView: React.FC = () => {
  const reloadSetup = useTcpStore((s) => s.reloadSetup);
  const [form, setForm] = useState<ApiForm>(EMPTY);
  const [setupId, setSetupId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [nonApiFields, setNonApiFields] = useState<{
    height_from: number;
    height_to: number;
    scan_duration_s: number | null;
    run_mode: number | null;
    demo_ean: string | null;
    demo_sn_count: number | null;
  }>({ height_from: 0, height_to: 999, scan_duration_s: null, run_mode: null, demo_ean: null, demo_sn_count: null });

  useEffect(() => {
    window.dbAPI.getSetup().then((setup) => {
      if (setup) {
        setSetupId(setup.id);
        setNonApiFields({
          height_from: setup.height_from,
          height_to: setup.height_to,
          scan_duration_s: setup.scan_duration_s ?? null,
          run_mode: setup.run_mode ?? null,
          demo_ean: setup.demo_ean ?? null,
          demo_sn_count: setup.demo_sn_count ?? null,
        });
        setForm({
          host_port_test: setup.host_port_test ?? '',
          host_port_prod: setup.host_port_prod ?? '',
          wms_api_username: setup.wms_api_username ?? '',
          wms_api_password_test: setup.wms_api_password_test ?? '',
          wms_api_password_prod: setup.wms_api_password_prod ?? '',
          uri_auth: setup.uri_auth ?? '',
          uri_user_validation: setup.uri_user_validation ?? '',
          uri_part_summary: setup.uri_part_summary ?? '',
          uri_scans: setup.uri_scans ?? '',
        });
      }
    });
  }, []);

  const handleSave = async () => {
    await window.dbAPI.upsertSetup({
      id: setupId ?? crypto.randomUUID(),
      ...nonApiFields,
      host_port_test: form.host_port_test || null,
      host_port_prod: form.host_port_prod || null,
      wms_api_username: form.wms_api_username || null,
      wms_api_password_test: form.wms_api_password_test || null,
      wms_api_password_prod: form.wms_api_password_prod || null,
      uri_auth: form.uri_auth || null,
      uri_user_validation: form.uri_user_validation || null,
      uri_part_summary: form.uri_part_summary || null,
      uri_scans: form.uri_scans || null,
    });
    await reloadSetup();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ paddingTop: 20, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
        <div
          className="bg-white rounded-lg shadow-sm p-6"
          style={{ flex: 1 }}
        >
          <h2 className="text-xl font-semibold mb-4">API Manager</h2>
          <div className="space-y-4">
            {FIELDS.map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <input
                  type={type ?? 'text'}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
        <div
          className="bg-white rounded-lg shadow-sm p-6"
          style={{ flex: 1 }}
        >
          <div className="space-y-4">
            {FIELDSURI.map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <input
                  type={type ?? 'text'}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
        style={{ alignSelf: 'flex-start' }}
      >
        <Save className="w-4 h-4" />
        {saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  );
};

export default ApiManagerView;
