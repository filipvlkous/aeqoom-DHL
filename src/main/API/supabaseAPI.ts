import { TimePeriod } from '../../renderer/Screens/Dashboard/Dashboard';
import { Message } from '../../renderer/useTcpStore';
import log from 'electron-log';

const key =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvdXRlaWJzb29pZ2t4ZHR1YXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQyMjgsImV4cCI6MjA3NzI1MDIyOH0.jG7qLOe5swEBxeTltE9MJmWt0NpZ4uUZpChTwwz67ac';
const url = 'https://aouteibsooigkxdtuayu.supabase.co';
const serviceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvdXRlaWJzb29pZ2t4ZHR1YXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3NDIyOCwiZXhwIjoyMDc3MjUwMjI4fQ.I8Jpz99DIfdmTN4GmQTsCvP39zESPyXheYF26aU2UV4';

export async function uploadLog(message: Message) {
  const receivedMs = message.receivedTime
    ? Date.parse(message.receivedTime)
    : null;
  const sendMs = message.sendTime ? Date.parse(message.sendTime) : null;

  const durationSeconds =
    receivedMs !== null && sendMs !== null
      ? Number(((sendMs - receivedMs) / 1000).toFixed(0))
      : null;

  const body = [
    {
      content: message.content?.map((item) => item.content) ?? [],
      regime: message.regime ?? null,
      receivedTime: message.receivedTime ?? null,
      sendTime: message.sendTime ?? null,
      imageName: message.imageName ?? null,
      duration: durationSeconds,
      totalSendCount: message.content?.length ?? 0,
      addedCount: message.content?.filter((item) => item.added)?.length ?? 0,
    },
  ];

  try {
    const res = await fetch(`${url}/rest/v1/logs`, {
      method: 'POST',
      headers: {
        apikey: `${key}`,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    });

    log.info('[uploadLog] Status:', res.status);

    let data: any = null;
    try {
      data = await res.json();
    } catch (jsonErr) {
      log.warn('[uploadLog] No JSON response returned', jsonErr);
      data = null;
    }

    if (!res.ok) {
      log.error('[uploadLog] ❌ Upload failed', {
        status: res.status,
        body,
        response: data,
      });
      return { success: false, error: data || 'Upload failed' };
    }

    log.info('[uploadLog] ✔ Successfully uploaded');
    return { success: true, error: null };
  } catch (err: any) {
    log.error('[uploadLog] ❌ Unexpected error', {
      message: err.message || err,
      stack: err.stack,
      body,
    });
    return { success: false, error: err.message || 'Unexpected error' };
  }
}
export async function uploadBase64ToSupabase(
  base64Data: string,
  bucketName: string,
  filePath: string,
  contentType: string,
) {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const response = await fetch(
      `${url}/storage/v1/object/${bucketName}/${filePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: bytes,
      },
    );

    if (!response.ok) {
      const txt = await response.text();
      log.error('[uploadBase64] ❌ Upload to bucket failed', {
        bucketName,
        filePath,
        response: txt,
      });
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    log.error('[uploadBase64] ❌ Unexpected error', {
      message: error.message || error,
      bucketName,
      filePath,
    });
    return null;
  }
}

export const callSupabaseFunction = async (
  functionName: string,
  params: { period_type: TimePeriod | null; target_regime?: number | null } = {
    period_type: null,
    target_regime: null,
  },
) => {
  try {
    const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        apikey: `${key}`,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const text = await response.text();
      log.error(`[callSupabaseFunction] ❌ RPC ${functionName} failed`, {
        params,
        status: response.status,
        response: text,
      });
      throw new Error('RPC Failed');
    }

    return await response.json();
  } catch (error: any) {
    log.error(`[callSupabaseFunction] ❌ Error calling ${functionName}`, {
      message: error.message || error,
      params,
    });
    return null;
  }
};
