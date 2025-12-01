import { TimePeriod } from '../../renderer/Screens/Dashboard/Dashboard';
import { Message } from '../../renderer/useTcpStore';

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
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/logs`, {
      method: 'POST',
      headers: {
        apikey: `${process.env.SUPABASE_KEY}`,
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation', // optional: returns inserted row(s)
      },
      body: JSON.stringify(body),
    });

    // ✅ Try to parse response safely
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // fallback if no JSON returned
      data = null;
    }

    // ✅ Check HTTP status
    if (!res.ok) {
      console.error('❌ Upload failed:', data || (await res.text()));
      return { success: false, error: data || 'Upload failed' };
    }

    // ✅ Optionally validate Supabase structure (if known)

    return { success: true, error: null };
  } catch (err: any) {
    console.error('❌ Network or unexpected error:', err.message || err);
    return { success: false, error: err.message || 'Unexpected error' };
  }
}

export async function uploadBase64ToSupabase(
  base64Data: string,
  bucketName: string,
  filePath: string,
  contentType: string,
) {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const response = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: bytes,
    },
  );

  const result = await response.json();
  return result;
}

export const callSupabaseFunction = async (
  functionName: string,
  params: { period_type: TimePeriod | null; target_regime?: number | null } = {
    period_type: null,
    target_regime: null,
  },
) => {
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          apikey: `${process.env.SUPABASE_KEY}`,
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        },
        body: JSON.stringify(params),
      },
    );
    if (!response.ok) throw new Error(`Failed`);
    return await response.json();
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    return null;
  }
};
