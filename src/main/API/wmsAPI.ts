import log from 'electron-log';
import { storeService } from '../serverStore';

const API_URL =
  'https://one.alensis.cz/api2/rest/inbounds/processItemsFromScanningStation';

export const processBarcodesAlensa = async (
  barcodes: string[],
  createBox: boolean,
) => {
  log.info('[processBarcodesAlensa] Called with:', { count: barcodes?.length });

  try {
    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      log.warn('[processBarcodesAlensa] No barcodes provided');
      return { success: false, error: 'No barcodes provided' };
    }

    const authToken = await storeService.get('authToken');
    const inboundId = await storeService.get('inboundId');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        barcodes,
        createBox: createBox,
        inboundId: inboundId || undefined,
      }),
    });

    log.info('[processBarcodesAlensa] Response status:', res.status);

    let data: any = null;
    try {
      data = await res.json();
    } catch (jsonErr) {
      log.warn('[processBarcodesAlensa] No JSON returned from API', {
        jsonErr,
      });
    }

    if (!res.ok) {
      log.error('[processBarcodesAlensa] ❌ HTTP failed', {
        status: res.status,
        barcodes,
        response: data,
      });

      return {
        success: false,
        error: data?.error || `HTTP error ${res.status}`,
      };
    }

    if (data?.status !== true) {
      log.error('[processBarcodesAlensa] ❌ API returned failure status', {
        barcodes,
        response: data,
      });

      return {
        success: false,
        error: data?.error || 'Unknown error',
      };
    }

    log.info('[processBarcodesAlensa] ✔ Success', {
      barcodesCount: barcodes.length,
    });
    return { success: true, error: null };
  } catch (err: any) {
    log.error('[processBarcodesAlensa] ❌ Unexpected error', {
      message: err.message || err,
      stack: err.stack,
      barcodes,
    });

    return {
      success: false,
      error: err.message || 'Network error',
    };
  }
};

export const finishInboundAlensa = async (
  inboundId: number,
): Promise<{ success: boolean; error: string | null }> => {
  log.info('[finishInboundAlensa] Called with inboundId:', inboundId);

  try {
    const authToken = await storeService.get('authToken');
    console.log(
      '[finishInboundAlensa] Retrieved authToken:',
      authToken ? 'Yes' : 'No',
    );
    console.log('[finishInboundAlensa] Inbound ID:', authToken);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(
      'https://one.alensis.cz/api2/rest/inbounds/finishInboundOnScanningStation',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ inboundId }),
      },
    );

    log.info('[finishInboundAlensa] Response status:', res.status);

    let data: any = null;
    try {
      data = await res.json();
    } catch (_) {}

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || `HTTP error ${res.status}`,
      };
    }

    if (!data?.status) {
      return { success: false, error: data?.error || 'Finish inbound failed' };
    }

    log.info('[finishInboundAlensa] ✔ Success');
    return { success: true, error: null };
  } catch (err: any) {
    log.error('[finishInboundAlensa] ❌ Unexpected error', err);
    return { success: false, error: err.message || 'Network error' };
  }
};

export const logoutAlensa = async (): Promise<{
  success: boolean;
  error: string | null;
}> => {
  log.info('[logoutAlensa] Called');

  try {
    const authToken = await storeService.get('authToken');
    if (!authToken) {
      return { success: true, error: null };
    }

    const res = await fetch('https://one.alensis.cz/api2/rest/auth/logout', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    log.info('[logoutAlensa] Response status:', res.status);

    // Clear token regardless of response – the session is over
    await storeService.set('authToken', '');

    if (!res.ok) {
      log.warn('[logoutAlensa] Non-OK response, but token cleared');
      return { success: true, error: null };
    }

    log.info('[logoutAlensa] ✔ Success');
    return { success: true, error: null };
  } catch (err: any) {
    log.error('[logoutAlensa] ❌ Unexpected error', err);
    // Still clear the token on network error so the UI can proceed
    await storeService.set('authToken', '').catch(() => {});
    return { success: false, error: err.message || 'Network error' };
  }
};
