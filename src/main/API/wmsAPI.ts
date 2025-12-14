import log from 'electron-log';

const API_URL =
  'https://one.alensis.cz/api2/rest/inbounds/processItemsFromScanningStation';

export const processBarcodesAlensa = async (barcodes: string[]) => {
  log.info('[processBarcodesAlensa] Called with:', { count: barcodes?.length });

  try {
    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      log.warn('[processBarcodesAlensa] No barcodes provided');
      return { success: false, error: 'No barcodes provided' };
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcodes }),
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
