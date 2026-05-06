import log from 'electron-log';
import { storeService } from '../serverStore';
import { databaseService } from '../serverStore/services/databaseService';

// ── helpers ──────────────────────────────────────────────────────────────────

async function getSetupConfig() {
  const setup = await databaseService.getSetup();
  if (!setup)
    throw new Error(
      'Setup not configured. Please fill in API Manager settings.',
    );

  const isProd = (setup.run_mode ?? 0) === 1;
  const host = isProd ? setup.host_port_prod : setup.host_port_test;
  const password = isProd
    ? setup.wms_api_password_prod
    : setup.wms_api_password_test;

  if (!host)
    throw new Error(`host_port_${isProd ? 'prod' : 'test'} is not configured.`);

  return {
    host: host.replace(/\/$/, ''),
    username: setup.wms_api_username ?? null,
    password: password ?? null,
    uri_auth: setup.uri_auth ?? null,
    uri_user_validation: setup.uri_user_validation ?? null,
    uri_part_summary: setup.uri_part_summary ?? null,
    uri_scans: setup.uri_scans ?? null,
  };
}

function buildUrl(host: string, uri: string | null): string {
  if (!uri) throw new Error('URI not configured.');
  return `${host}${uri}`;
}

export const wmsLogin = async (): Promise<{
  success: boolean;
  token: string | null;
  error: string | null;
}> => {
  log.info('[wmsLogin] Called');
  try {
    const cfg = await getSetupConfig();
    const url = buildUrl(cfg.host, cfg.uri_auth);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cfg.username,
        password: cfg.password,
      }),
    });
    console.log('[wmsLogin] Response status:', res);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        token: null,
        error: data?.error || `HTTP ${res.status}`,
      };
    }

    const token: string = data?.token ?? data?.access_token ?? null;
    log.info('[wmsLogin] ✔ Success');
    return { success: true, token, error: null };
  } catch (err: any) {
    log.error('[wmsLogin] ❌', err);
    return {
      success: false,
      token: null,
      error: err.message || 'Network error',
    };
  }
};

export const wmsValidateUser = async (
  userId: string,
): Promise<{
  success: boolean;
  data: any;
  error: string | null;
}> => {
  log.info('[wmsValidateUser] userId:', userId);
  try {
    const cfg = await getSetupConfig();
    if (!cfg.uri_user_validation)
      throw new Error('uri_user_validation not configured.');
    const url = buildUrl(
      cfg.host,
      cfg.uri_user_validation.replace('{userId}', encodeURIComponent(userId)),
    );
    const wmsToken = await storeService.get('wmsToken');

    const res = await fetch(url, {
      headers: wmsToken ? { Authorization: `Bearer ${wmsToken}` } : {},
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: data?.error || `HTTP ${res.status}`,
      };
    }

    return { success: true, data, error: null };
  } catch (err: any) {
    log.error('[wmsValidateUser] ❌', err);
    return {
      success: false,
      data: null,
      error: err.message || 'Network error',
    };
  }
};

export const wmsGetPartSummary = async (
  palletId: string,
): Promise<{
  success: boolean;
  data: any;
  error: string | null;
}> => {
  log.info('[wmsGetPartSummary] palletId:', palletId);
  try {
    const cfg = await getSetupConfig();
    if (!cfg.uri_part_summary)
      throw new Error('uri_part_summary not configured.');
    const url = buildUrl(
      cfg.host,
      cfg.uri_part_summary.replace('{palletId}', encodeURIComponent(palletId)),
    );
    const wmsToken = await storeService.get('wmsToken');

    const res = await fetch(url, {
      headers: wmsToken ? { Authorization: `Bearer ${wmsToken}` } : {},
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: data?.error || `HTTP ${res.status}`,
      };
    }

    return { success: true, data, error: null };
  } catch (err: any) {
    log.error('[wmsGetPartSummary] ❌', err);
    return {
      success: false,
      data: null,
      error: err.message || 'Network error',
    };
  }
};

export const wmsSendScanResults = async (
  payload: object,
): Promise<{
  success: boolean;
  data: any;
  error: string | null;
}> => {
  log.info('[wmsSendScanResults] Called');
  try {
    const cfg = await getSetupConfig();
    const url = buildUrl(cfg.host, cfg.uri_scans);
    const wmsToken = await storeService.get('wmsToken');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (wmsToken) headers['Authorization'] = `Bearer ${wmsToken}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: data?.error || `HTTP ${res.status}`,
      };
    }

    return { success: true, data, error: null };
  } catch (err: any) {
    log.error('[wmsSendScanResults] ❌', err);
    return {
      success: false,
      data: null,
      error: err.message || 'Network error',
    };
  }
};
